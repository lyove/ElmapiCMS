<?php

use App\Models\Project;
use App\Models\ProjectAuthRefreshToken;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use App\Services\Auth\JwtTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create([
        'public_api' => false,
    ]);
});

test('project auth user token cannot access ability protected content APIs', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'user-token@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $accessToken = (string) $signup->json('access_token');

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->getJson('/api/collections');

    $response->assertForbidden();
});

test('project PAT with read ability can access content APIs', function () {
    $token = $this->project->createToken('test-read', ['read'])->plainTextToken;

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => 'Bearer '.$token,
    ])->getJson('/api/collections');

    $response->assertOk();
});

test('password hash is hidden from serialization', function () {
    $user = ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
    ]);

    $array = $user->toArray();

    expect($array)->not->toHaveKey('password');
});

test('public API project allows read access without authentication', function () {
    $project = Project::factory()->create(['public_api' => true]);

    $response = $this->withHeaders([
        'project-id' => $project->uuid,
    ])->getJson('/api/collections');

    $response->assertOk();
});

test('public API project denies write access without authentication', function () {
    $project = Project::factory()->create(['public_api' => true]);

    $response = $this->withHeaders([
        'project-id' => $project->uuid,
    ])->postJson('/api/collections', [
        'name' => 'Test',
        'slug' => 'test',
    ]);

    $response->assertForbidden();
});

test('suspended user cannot sign in', function () {
    ProjectAuthUser::factory()->suspended()->create([
        'project_id' => $this->project->id,
        'email' => 'suspended@example.com',
        'password' => bcrypt('password123'),
    ]);

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/login', [
        'email' => 'suspended@example.com',
        'password' => 'password123',
    ]);

    $response->assertUnauthorized();
});

test('suspended user access token is rejected', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'tosuspend@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $accessToken = (string) $signup->json('access_token');

    $user = ProjectAuthUser::query()->where('email', 'tosuspend@example.com')->first();
    $user->update(['suspended_at' => now()]);

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->getJson('/api/auth/me');

    $response->assertUnauthorized();
});

test('session limit revokes oldest sessions', function () {
    config(['project_auth.max_sessions_per_user' => 3]);

    $headers = ['project-id' => $this->project->uuid];

    $this->withHeaders($headers)->postJson('/api/auth/signup', [
        'email' => 'limit@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    foreach (range(1, 3) as $i) {
        $this->withHeaders($headers)->postJson('/api/auth/login', [
            'email' => 'limit@example.com',
            'password' => 'secret1234',
        ])->assertOk();
    }

    $user = ProjectAuthUser::query()->where('email', 'limit@example.com')->first();

    $activeSessions = ProjectAuthSession::query()
        ->where('project_id', $this->project->id)
        ->where('project_auth_user_id', $user->id)
        ->whereNull('revoked_at')
        ->count();

    expect($activeSessions)->toBeLessThanOrEqual(3);
});

test('resolvePrivateKey throws when decryption fails', function () {
    $service = app(JwtTokenService::class);
    $reflection = new ReflectionMethod($service, 'resolvePrivateKey');

    expect(fn () => $reflection->invoke($service, 'clearly-not-encrypted-with-current-key'))
        ->toThrow(RuntimeException::class, 'Unable to decrypt JWT signing key');
});

test('prune command runs in dry-run mode without errors', function () {
    $this->artisan('app:prune-project-auth-data', ['--dry-run' => true])
        ->assertExitCode(0);
});

test('prune command deletes expired tokens', function () {
    $user = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    $session = ProjectAuthSession::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $user->id,
        'expires_at' => now()->subDays(10),
        'revoked_at' => now()->subDays(10),
        'updated_at' => now()->subDays(10),
    ]);

    ProjectAuthRefreshToken::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $user->id,
        'project_auth_session_id' => $session->id,
        'expires_at' => now()->subDays(10),
        'revoked_at' => now()->subDays(10),
        'updated_at' => now()->subDays(10),
    ]);

    $this->artisan('app:prune-project-auth-data')->assertExitCode(0);

    expect(ProjectAuthRefreshToken::query()->where('project_id', $this->project->id)->count())->toBe(0);
});

test('auth security gate check command passes with valid config', function () {
    config([
        'project_auth.access_token_ttl_minutes' => 15,
        'project_auth.refresh_token_ttl_days' => 30,
        'project_auth.audit_retention_days' => 90,
    ]);

    $this->artisan('app:auth-security-gate-check')
        ->assertExitCode(0);
});
