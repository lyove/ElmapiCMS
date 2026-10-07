<?php

use App\Mail\ProjectAuthVerificationMail;
use App\Models\Project;
use App\Models\ProjectAuthApiKey;
use App\Models\ProjectAuthAuditEvent;
use App\Models\ProjectAuthRefreshToken;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create(['public_api' => false]);
    $this->user = User::factory()->create();

    Permission::findOrCreate('access_auth_settings', 'web');
    Permission::findOrCreate('access_all_projects', 'web');
    $this->user->givePermissionTo(['access_auth_settings', 'access_all_projects']);

    $this->actingAs($this->user);
});

test('auth settings page route exists and requires auth', function () {
    $this->assertNotNull(route('projects.settings.auth.index', $this->project->id));
});

test('auth section pages routes exist', function () {
    $this->assertNotNull(route('projects.settings.auth.users.page', $this->project->id));
    $this->assertNotNull(route('projects.settings.auth.sessions.page', $this->project->id));
    $this->assertNotNull(route('projects.settings.auth.api-keys.page', $this->project->id));
    $this->assertNotNull(route('projects.settings.auth.audit.page', $this->project->id));
    $this->assertNotNull(route('projects.settings.auth.email-verification.page', $this->project->id));
});

test('list auth users', function () {
    ProjectAuthUser::factory()->count(3)->create(['project_id' => $this->project->id]);

    $response = $this->getJson(route('projects.settings.auth.users.index', $this->project->id));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(3);
});

test('create auth user via settings', function () {
    $response = $this->postJson(route('projects.settings.auth.users.store', $this->project->id), [
        'email' => 'new@example.com',
        'password' => 'securePassword1',
        'display_name' => 'New User',
    ]);

    $response->assertCreated()
        ->assertJsonPath('email', 'new@example.com');

    $user = ProjectAuthUser::query()->where('email', 'new@example.com')->first();
    expect($user)->not->toBeNull()
        ->and($user->metadata)->toBeArray();
});

test('update auth user via settings', function () {
    $authUser = ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
        'email' => 'existing@example.com',
    ]);

    $response = $this->putJson(route('projects.settings.auth.users.update', [$this->project->id, $authUser->id]), [
        'display_name' => 'Updated Name',
    ]);

    $response->assertOk();
    $authUser->refresh();
    expect($authUser->display_name)->toBe('Updated Name');
});

test('suspend and unsuspend auth user', function () {
    $authUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);

    $this->putJson(route('projects.settings.auth.users.update', [$this->project->id, $authUser->id]), [
        'suspended' => true,
    ])->assertOk();

    $authUser->refresh();
    expect($authUser->suspended_at)->not->toBeNull();

    $this->putJson(route('projects.settings.auth.users.update', [$this->project->id, $authUser->id]), [
        'suspended' => false,
    ])->assertOk();

    $authUser->refresh();
    expect($authUser->suspended_at)->toBeNull();
});

test('suspending auth user revokes all active user api keys', function () {
    $authUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);

    $firstKey = $this->postJson(route('projects.settings.auth.api-keys.store', $this->project->id), [
        'project_auth_user_id' => $authUser->id,
        'name' => 'First key',
        'scopes' => ['read'],
    ])->assertCreated();

    $secondKey = $this->postJson(route('projects.settings.auth.api-keys.store', $this->project->id), [
        'project_auth_user_id' => $authUser->id,
        'name' => 'Second key',
        'scopes' => ['write'],
    ])->assertCreated();

    $this->putJson(route('projects.settings.auth.users.update', [$this->project->id, $authUser->id]), [
        'suspended' => true,
    ])->assertOk();

    $first = ProjectAuthApiKey::query()->find((int) $firstKey->json('id'));
    $second = ProjectAuthApiKey::query()->find((int) $secondKey->json('id'));

    expect($first)->not->toBeNull()
        ->and($first->revoked_at)->not->toBeNull()
        ->and($second)->not->toBeNull()
        ->and($second->revoked_at)->not->toBeNull();
});

test('admin can update strict verification policy and email customization settings', function () {
    $response = $this->putJson(route('projects.settings.auth.settings.update', $this->project->id), [
        'require_verified_email' => true,
        'verification_email' => [
            'subject' => 'Please verify your Elmapi account',
            'heading' => 'Verify your account',
            'intro' => 'Click to verify before signing in.',
            'button_text' => 'Verify now',
            'outro' => 'Ignore if this was not you.',
            'from_name' => 'Elmapi Team',
            'from_email' => 'security@example.com',
            'verification_url_base' => 'https://frontend.example.com',
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('require_verified_email', true)
        ->assertJsonPath('verification_email.subject', 'Please verify your Elmapi account');

    $this->project->refresh();
    expect($this->project->project_auth_require_verified_email)->toBeTrue()
        ->and($this->project->project_auth_email_verification_config)->toBeArray();
});

test('enabling strict verification policy revokes unverified active sessions', function () {
    $verifiedUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    $unverifiedUser = ProjectAuthUser::factory()->unverified()->create(['project_id' => $this->project->id]);

    $verifiedSession = ProjectAuthSession::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $verifiedUser->id,
        'revoked_at' => null,
    ]);
    $unverifiedSession = ProjectAuthSession::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $unverifiedUser->id,
        'revoked_at' => null,
    ]);

    $this->putJson(route('projects.settings.auth.settings.update', $this->project->id), [
        'require_verified_email' => true,
        'verification_email' => [],
    ])->assertOk();

    $verifiedSession->refresh();
    $unverifiedSession->refresh();

    expect($verifiedSession->revoked_at)->toBeNull()
        ->and($unverifiedSession->revoked_at)->not->toBeNull();
});

test('suspending auth user revokes active sessions and refresh tokens', function () {
    $authUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    $session = ProjectAuthSession::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $authUser->id,
        'revoked_at' => null,
    ]);
    $refreshToken = ProjectAuthRefreshToken::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $authUser->id,
        'project_auth_session_id' => $session->id,
        'revoked_at' => null,
    ]);

    $this->putJson(route('projects.settings.auth.users.update', [$this->project->id, $authUser->id]), [
        'suspended' => true,
    ])->assertOk();

    $session->refresh();
    $refreshToken->refresh();

    expect($session->revoked_at)->not->toBeNull()
        ->and($refreshToken->revoked_at)->not->toBeNull();
});

test('admin can mark user as verified and unverified', function () {
    $authUser = ProjectAuthUser::factory()->unverified()->create(['project_id' => $this->project->id]);

    $this->putJson(route('projects.settings.auth.users.update', [$this->project->id, $authUser->id]), [
        'verified' => true,
    ])->assertOk();

    $authUser->refresh();
    expect($authUser->email_verified_at)->not->toBeNull();

    $this->putJson(route('projects.settings.auth.users.update', [$this->project->id, $authUser->id]), [
        'verified' => false,
    ])->assertOk();

    $authUser->refresh();
    expect($authUser->email_verified_at)->toBeNull();
});

test('admin can resend verification email for unverified user', function () {
    Mail::fake();

    $authUser = ProjectAuthUser::factory()->unverified()->create([
        'project_id' => $this->project->id,
        'email' => 'resend-admin@example.com',
    ]);

    $this->postJson(route('projects.settings.auth.users.resend-verification', [$this->project->id, $authUser->id]))
        ->assertOk()
        ->assertJsonPath('message', 'Verification email sent.');

    Mail::assertSent(ProjectAuthVerificationMail::class);
});

test('delete auth user', function () {
    $authUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);

    $response = $this->deleteJson(route('projects.settings.auth.users.destroy', [$this->project->id, $authUser->id]));

    $response->assertOk();
    expect(ProjectAuthUser::withTrashed()->find($authUser->id)->deleted_at)->not->toBeNull();
});

test('can recreate auth user with same email after soft delete', function () {
    $first = $this->postJson(route('projects.settings.auth.users.store', $this->project->id), [
        'email' => 'reuse@example.com',
        'password' => 'securePassword1',
        'display_name' => 'First User',
    ])->assertCreated();

    $firstUserId = (int) $first->json('id');

    $this->deleteJson(route('projects.settings.auth.users.destroy', [$this->project->id, $firstUserId]))
        ->assertOk();

    $second = $this->postJson(route('projects.settings.auth.users.store', $this->project->id), [
        'email' => 'reuse@example.com',
        'password' => 'securePassword2',
        'display_name' => 'Second User',
    ])->assertCreated();

    $secondUserId = (int) $second->json('id');
    expect($secondUserId)->not->toBe($firstUserId);
});

test('deleting auth user deletes all user api keys', function () {
    $authUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);

    $key = $this->postJson(route('projects.settings.auth.api-keys.store', $this->project->id), [
        'project_auth_user_id' => $authUser->id,
        'name' => 'Delete with user',
        'scopes' => ['read'],
    ])->assertCreated();

    $keyId = (int) $key->json('id');

    $this->deleteJson(route('projects.settings.auth.users.destroy', [$this->project->id, $authUser->id]))
        ->assertOk();

    expect(ProjectAuthApiKey::query()->find($keyId))->toBeNull();
});

test('deleting auth user revokes sessions and refresh tokens', function () {
    $authUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    $session = ProjectAuthSession::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $authUser->id,
        'revoked_at' => null,
    ]);
    $refreshToken = ProjectAuthRefreshToken::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $authUser->id,
        'project_auth_session_id' => $session->id,
        'revoked_at' => null,
    ]);

    $this->deleteJson(route('projects.settings.auth.users.destroy', [$this->project->id, $authUser->id]))
        ->assertOk();

    $session->refresh();
    $refreshToken->refresh();

    expect($session->revoked_at)->not->toBeNull()
        ->and($refreshToken->revoked_at)->not->toBeNull();
});

test('list sessions', function () {
    $authUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    ProjectAuthSession::factory()->count(2)->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $authUser->id,
    ]);

    $response = $this->getJson(route('projects.settings.auth.sessions.index', $this->project->id));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
});

test('list sessions hides sessions for deleted users', function () {
    $activeUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    $deletedUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);

    ProjectAuthSession::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $activeUser->id,
    ]);
    ProjectAuthSession::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $deletedUser->id,
    ]);

    $this->deleteJson(route('projects.settings.auth.users.destroy', [$this->project->id, $deletedUser->id]))
        ->assertOk();

    $response = $this->getJson(route('projects.settings.auth.sessions.index', $this->project->id));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.auth_user.email'))->toBe($activeUser->email);
});

test('revoke session', function () {
    $authUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    $session = ProjectAuthSession::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $authUser->id,
    ]);

    $response = $this->postJson(route('projects.settings.auth.sessions.revoke', [$this->project->id, $session->id]));

    $response->assertOk();
    $session->refresh();
    expect($session->revoked_at)->not->toBeNull();
});

test('list audit events', function () {
    $response = $this->getJson(route('projects.settings.auth.audit.index', $this->project->id));

    $response->assertOk();
});

test('list audit events keeps deleted user events with deleted user metadata snapshot', function () {
    $activeUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    $deletedUser = ProjectAuthUser::factory()->create(['project_id' => $this->project->id]);
    $deletedUserEmail = $deletedUser->email;

    ProjectAuthAuditEvent::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $activeUser->id,
        'project_auth_session_id' => null,
        'event_type' => 'auth.login.success',
    ]);
    ProjectAuthAuditEvent::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => $deletedUser->id,
        'project_auth_session_id' => null,
        'event_type' => 'auth.login.failed',
    ]);
    ProjectAuthAuditEvent::factory()->create([
        'project_id' => $this->project->id,
        'project_auth_user_id' => null,
        'project_auth_session_id' => null,
        'event_type' => 'auth.signup.failed',
    ]);

    $deletedUser->delete();

    $response = $this->getJson(route('projects.settings.auth.audit.index', $this->project->id));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(3);

    $deletedEvent = collect($response->json('data'))
        ->first(fn (array $item): bool => (int) ($item['project_auth_user_id'] ?? 0) === $deletedUser->id);

    expect($deletedEvent)->not->toBeNull()
        ->and(data_get($deletedEvent, 'auth_user'))->toBeNull()
        ->and(data_get($deletedEvent, 'deleted_user_email'))->toBe($deletedUserEmail);
});

test('admin can create and revoke project auth user api key in settings', function () {
    $authUser = ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
        'email' => 'settings-keys@example.com',
    ]);

    $created = $this->postJson(route('projects.settings.auth.api-keys.store', $this->project->id), [
        'project_auth_user_id' => $authUser->id,
        'name' => 'Settings key',
        'scopes' => ['read', 'write'],
    ])->assertCreated();

    $created->assertJsonStructure([
        'id',
        'key_prefix',
        'plain_text_key',
    ]);

    $this->getJson(route('projects.settings.auth.api-keys.index', $this->project->id))
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Settings key');

    $keyId = (int) $created->json('id');
    $this->postJson(route('projects.settings.auth.api-keys.revoke', [$this->project->id, $keyId]))
        ->assertOk()
        ->assertJsonPath('message', 'API key revoked.');

    $key = ProjectAuthApiKey::query()->find($keyId);
    expect($key)->not->toBeNull()
        ->and($key->revoked_at)->not->toBeNull();
});

test('admin can update project auth user api key metadata in settings', function () {
    $firstUser = ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
        'email' => 'first-user@example.com',
    ]);
    $secondUser = ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
        'email' => 'second-user@example.com',
    ]);

    $created = $this->postJson(route('projects.settings.auth.api-keys.store', $this->project->id), [
        'project_auth_user_id' => $firstUser->id,
        'name' => 'Original Name',
        'scopes' => ['read'],
    ])->assertCreated();

    $keyId = (int) $created->json('id');
    $before = ProjectAuthApiKey::query()->findOrFail($keyId);
    $beforeHash = $before->key_hash;

    $this->putJson(route('projects.settings.auth.api-keys.update', [$this->project->id, $keyId]), [
        'project_auth_user_id' => $secondUser->id,
        'name' => 'Updated Name',
        'scopes' => ['read', 'write'],
        'expires_at' => now()->addDays(3)->toIso8601String(),
    ])->assertOk()
        ->assertJsonPath('name', 'Updated Name')
        ->assertJsonPath('project_auth_user_id', $secondUser->id);

    $after = ProjectAuthApiKey::query()->findOrFail($keyId);
    expect($after->name)->toBe('Updated Name')
        ->and($after->project_auth_user_id)->toBe($secondUser->id)
        ->and($after->scopes)->toBe(['read', 'write'])
        ->and($after->expires_at)->not->toBeNull()
        ->and($after->key_hash)->toBe($beforeHash);
});

test('admin can delete revoked project auth user api key in settings', function () {
    $authUser = ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
    ]);

    $created = $this->postJson(route('projects.settings.auth.api-keys.store', $this->project->id), [
        'project_auth_user_id' => $authUser->id,
        'name' => 'Deletable revoked key',
        'scopes' => ['read'],
    ])->assertCreated();

    $keyId = (int) $created->json('id');

    $this->postJson(route('projects.settings.auth.api-keys.revoke', [$this->project->id, $keyId]))
        ->assertOk();

    $this->deleteJson(route('projects.settings.auth.api-keys.destroy', [$this->project->id, $keyId]))
        ->assertOk()
        ->assertJsonPath('message', 'API key deleted.');

    expect(ProjectAuthApiKey::query()->find($keyId))->toBeNull();
});

test('admin can delete revoked api key when auth user is soft deleted', function () {
    $authUser = ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
    ]);

    $created = $this->postJson(route('projects.settings.auth.api-keys.store', $this->project->id), [
        'project_auth_user_id' => $authUser->id,
        'name' => 'Revoked key for deleted user',
        'scopes' => ['read'],
    ])->assertCreated();

    $keyId = (int) $created->json('id');

    $this->postJson(route('projects.settings.auth.api-keys.revoke', [$this->project->id, $keyId]))
        ->assertOk();

    $authUser->delete();

    $this->deleteJson(route('projects.settings.auth.api-keys.destroy', [$this->project->id, $keyId]))
        ->assertOk()
        ->assertJsonPath('message', 'API key deleted.');

    expect(ProjectAuthApiKey::query()->find($keyId))->toBeNull();
});

test('admin cannot delete active project auth user api key in settings', function () {
    $authUser = ProjectAuthUser::factory()->create([
        'project_id' => $this->project->id,
    ]);

    $created = $this->postJson(route('projects.settings.auth.api-keys.store', $this->project->id), [
        'project_auth_user_id' => $authUser->id,
        'name' => 'Active key',
        'scopes' => ['read'],
    ])->assertCreated();

    $keyId = (int) $created->json('id');

    $this->deleteJson(route('projects.settings.auth.api-keys.destroy', [$this->project->id, $keyId]))
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Only revoked API keys can be deleted.');

    expect(ProjectAuthApiKey::query()->find($keyId))->not->toBeNull();
});
