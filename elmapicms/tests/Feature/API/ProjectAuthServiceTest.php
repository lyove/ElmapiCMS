<?php

use App\Mail\ProjectAuthVerificationMail;
use App\Models\Project;
use App\Models\ProjectAuthAuditEvent;
use App\Models\ProjectAuthRefreshToken;
use App\Models\ProjectAuthUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create([
        'public_api' => false,
    ]);
});

test('project auth signup issues access and refresh tokens', function () {
    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'jane@example.com',
        'password' => 'secret1234',
        'display_name' => 'Jane Doe',
    ]);

    $response->assertCreated()
        ->assertJsonStructure([
            'access_token',
            'token_type',
            'expires_at',
            'refresh_token',
            'refresh_token_expires_at',
            'user' => ['uuid', 'email', 'display_name'],
        ]);

    expect(ProjectAuthUser::query()->where('project_id', $this->project->id)->count())->toBe(1)
        ->and(ProjectAuthRefreshToken::query()->where('project_id', $this->project->id)->count())->toBe(1);
});

test('project auth login returns generic error for invalid credentials', function () {
    ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
        'email' => 'john@example.com',
        'password' => bcrypt('correct-password'),
    ]);

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/login', [
        'email' => 'john@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertUnauthorized()
        ->assertJsonPath('message', 'Invalid credentials.');
});

test('refresh rotates token and revokes previous refresh token', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'rotate@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $firstRefreshToken = (string) $signup->json('refresh_token');
    $firstRefreshHash = hash('sha256', $firstRefreshToken);

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/refresh', [
        'refresh_token' => $firstRefreshToken,
    ]);

    $response->assertOk()->assertJsonStructure([
        'access_token',
        'refresh_token',
    ]);

    $revokedToken = ProjectAuthRefreshToken::query()
        ->where('project_id', $this->project->id)
        ->where('token_hash', $firstRefreshHash)
        ->first();

    expect($revokedToken)->not->toBeNull()
        ->and($revokedToken->revoked_at)->not->toBeNull();
});

test('me endpoint returns authenticated project auth user', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'me@example.com',
        'password' => 'secret1234',
        'display_name' => 'Me User',
    ])->assertCreated();

    $accessToken = (string) $signup->json('access_token');

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->getJson('/api/auth/me');

    $response->assertOk()
        ->assertJsonPath('user.email', 'me@example.com')
        ->assertJsonPath('user.display_name', 'Me User');
});

test('access token from one project cannot access another project', function () {
    $projectB = Project::factory()->create(['public_api' => false]);

    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'tenant@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $accessToken = (string) $signup->json('access_token');

    $response = $this->withHeaders([
        'project-id' => $projectB->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->getJson('/api/auth/me');

    $response->assertUnauthorized();
});

test('auth audit events are recorded for sign up and login failures', function () {
    $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'audit@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/login', [
        'email' => 'audit@example.com',
        'password' => 'wrong',
    ])->assertUnauthorized();

    expect(ProjectAuthAuditEvent::query()
        ->where('project_id', $this->project->id)
        ->whereIn('event_type', ['auth.signup.success', 'auth.login.failed'])
        ->count())->toBe(2);
});

test('login lockout activates after repeated failed attempts', function () {
    ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
        'email' => 'lockout@example.com',
        'password' => bcrypt('correct-password'),
    ]);

    $headers = ['project-id' => $this->project->uuid];

    foreach (range(1, 5) as $attempt) {
        $this->withHeaders($headers)->postJson('/api/auth/login', [
            'email' => 'lockout@example.com',
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    $response = $this->withHeaders($headers)->postJson('/api/auth/login', [
        'email' => 'lockout@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(429)
        ->assertJsonPath('message', 'Invalid credentials.');
});

test('signup returns verification-required payload when strict verification policy is enabled', function () {
    Mail::fake();

    $this->project->update(['project_auth_require_verified_email' => true]);

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'strict-signup@example.com',
        'password' => 'secret1234',
    ]);

    $response->assertStatus(202)
        ->assertJsonPath('code', 'email_verification_required')
        ->assertJsonPath('verification_required', true)
        ->assertJsonMissingPath('access_token');

    Mail::assertSent(ProjectAuthVerificationMail::class);
});

test('unverified user login is forbidden when strict verification policy is enabled', function () {
    Mail::fake();

    ProjectAuthUser::factory()->unverified()->create([
        'project_id' => $this->project->id,
        'email' => 'unverified@example.com',
        'password' => bcrypt('correct-password'),
    ]);
    $this->project->update(['project_auth_require_verified_email' => true]);

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/login', [
        'email' => 'unverified@example.com',
        'password' => 'correct-password',
    ]);

    $response->assertForbidden()
        ->assertJsonPath('code', 'email_verification_required');

    Mail::assertSent(ProjectAuthVerificationMail::class);
});

test('verification confirm marks user as verified and allows login in strict mode', function () {
    Mail::fake();

    $this->project->update(['project_auth_require_verified_email' => true]);

    $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'verify-me@example.com',
        'password' => 'secret1234',
    ])->assertStatus(202);

    $verificationUrl = null;
    Mail::assertSent(ProjectAuthVerificationMail::class, function (ProjectAuthVerificationMail $mail) use (&$verificationUrl) {
        $verificationUrl = $mail->verificationUrl;

        return true;
    });

    parse_str((string) parse_url((string) $verificationUrl, PHP_URL_QUERY), $query);
    $token = (string) ($query['token'] ?? '');

    $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/verify-email/confirm', [
        'token' => $token,
    ])->assertOk()
        ->assertJsonPath('message', 'Email verified.');

    $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/login', [
        'email' => 'verify-me@example.com',
        'password' => 'secret1234',
    ])->assertOk()
        ->assertJsonStructure(['access_token', 'refresh_token']);
});
