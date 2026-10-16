<?php

use App\Models\Project;
use App\Models\ProjectAuthApiKey;
use App\Models\ProjectAuthUser;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create([
        'public_api' => false,
    ]);
});

test('authenticated project auth user can create and list own API keys', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'keys@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $accessToken = (string) $signup->json('access_token');

    $created = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->postJson('/api/auth/api-keys', [
        'name' => 'My integration key',
        'scopes' => ['read', 'write'],
    ])->assertCreated();

    $created->assertJsonStructure([
        'id',
        'name',
        'key_prefix',
        'scopes',
        'plain_text_key',
    ]);

    expect($created->json('plain_text_key'))->toStartWith('uak_');

    $listed = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->getJson('/api/auth/api-keys')->assertOk();

    $listed->assertJsonPath('data.0.name', 'My integration key');
    expect($listed->json('data.0'))->not->toHaveKey('plain_text_key');
});

test('authenticated project auth user can revoke own API key', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'revoke@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $accessToken = (string) $signup->json('access_token');

    $created = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->postJson('/api/auth/api-keys', [
        'name' => 'Revoke key',
    ])->assertCreated();

    $keyId = (int) $created->json('id');

    $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->postJson("/api/auth/api-keys/{$keyId}/revoke")
        ->assertOk()
        ->assertJsonPath('message', 'API key revoked.');

    $key = ProjectAuthApiKey::query()->find($keyId);
    expect($key)->not->toBeNull()
        ->and($key->revoked_at)->not->toBeNull();
});

test('API key cannot directly access Elmapi content routes', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'boundary@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $accessToken = (string) $signup->json('access_token');

    $created = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$accessToken}",
    ])->postJson('/api/auth/api-keys', [
        'name' => 'Boundary key',
        'scopes' => ['read'],
    ])->assertCreated();

    $userApiKey = (string) $created->json('plain_text_key');

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$userApiKey}",
    ])->getJson('/api/collections');

    $response->assertUnauthorized();
});

test('PAT with introspect ability can introspect API key', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'inspect@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $userToken = (string) $signup->json('access_token');

    $created = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$userToken}",
    ])->postJson('/api/auth/api-keys', [
        'name' => 'Inspectable key',
        'scopes' => ['read', 'orders.write'],
    ])->assertCreated();

    $rawKey = (string) $created->json('plain_text_key');
    $servicePat = $this->project->createToken('introspect-service', ['introspect'])->plainTextToken;

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$servicePat}",
    ])->postJson('/api/auth/api-keys/introspect', [
        'api_key' => $rawKey,
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'active',
            'project_uuid',
            'user_uuid',
            'scopes',
            'expires_at',
            'key_id',
            'key_prefix',
        ])
        ->assertJsonPath('active', true)
        ->assertJsonPath('project_uuid', $this->project->uuid)
        ->assertJsonPath('key_prefix', $created->json('key_prefix'));

    expect($response->json('scopes'))->toContain('orders.write');
});

test('introspection returns inactive for revoked and unknown keys', function () {
    $servicePat = $this->project->createToken('introspect-service', ['introspect'])->plainTextToken;

    $unknown = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$servicePat}",
    ])->postJson('/api/auth/api-keys/introspect', [
        'api_key' => 'uak_fakeprefix_'.str_repeat('a', 64),
    ]);

    $unknown->assertOk()
        ->assertJsonStructure([
            'active',
            'project_uuid',
            'user_uuid',
            'scopes',
            'expires_at',
            'key_id',
            'key_prefix',
        ])
        ->assertJsonPath('active', false)
        ->assertJsonPath('project_uuid', $this->project->uuid);

    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'revoked-introspection@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $userToken = (string) $signup->json('access_token');

    $created = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$userToken}",
    ])->postJson('/api/auth/api-keys', [
        'name' => 'Revoked key',
    ])->assertCreated();

    $rawKey = (string) $created->json('plain_text_key');
    $keyId = (int) $created->json('id');

    $authUser = ProjectAuthUser::query()
        ->where('project_id', $this->project->id)
        ->where('email', 'revoked-introspection@example.com')
        ->first();

    ProjectAuthApiKey::query()
        ->where('id', $keyId)
        ->update(['revoked_at' => now(), 'project_auth_user_id' => $authUser->id]);

    $revoked = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$servicePat}",
    ])->postJson('/api/auth/api-keys/introspect', [
        'api_key' => $rawKey,
    ]);

    $revoked->assertOk()->assertJsonPath('active', false);
});

test('introspection response contract is stable and typed', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'contract@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $userToken = (string) $signup->json('access_token');

    $created = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$userToken}",
    ])->postJson('/api/auth/api-keys', [
        'name' => 'Contract key',
        'scopes' => ['read', 'orders.write'],
        'expires_at' => now()->addDay()->toIso8601String(),
    ])->assertCreated();

    $servicePat = $this->project->createToken('introspect-service', ['introspect'])->plainTextToken;
    $rawKey = (string) $created->json('plain_text_key');

    $active = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$servicePat}",
    ])->postJson('/api/auth/api-keys/introspect', [
        'api_key' => $rawKey,
    ])->assertOk();

    $active->assertJsonStructure([
        'active',
        'project_uuid',
        'user_uuid',
        'scopes',
        'expires_at',
        'key_id',
        'key_prefix',
    ])->assertJsonPath('active', true)
        ->assertJsonPath('project_uuid', $this->project->uuid);

    expect($active->json('user_uuid'))->toBeString()
        ->and($active->json('scopes'))->toBeArray()
        ->and($active->json('key_id'))->toBeInt()
        ->and($active->json('key_prefix'))->toBeString()
        ->and($active->json('expires_at'))->toBeString();

    $inactive = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$servicePat}",
    ])->postJson('/api/auth/api-keys/introspect', [
        'api_key' => 'uak_missingprefix_'.str_repeat('z', 64),
    ])->assertOk();

    $inactive->assertJsonStructure([
        'active',
        'project_uuid',
        'user_uuid',
        'scopes',
        'expires_at',
        'key_id',
        'key_prefix',
    ])->assertJsonPath('active', false)
        ->assertJsonPath('project_uuid', $this->project->uuid)
        ->assertJsonPath('user_uuid', null)
        ->assertJsonPath('expires_at', null)
        ->assertJsonPath('key_id', null)
        ->assertJsonPath('key_prefix', null);

    expect($inactive->json('scopes'))->toBeArray()->toBe([]);
});

test('introspection endpoint is rate limited', function () {
    config(['project_auth.rate_limits.api_key_introspect_per_minute' => 2]);

    $servicePat = $this->project->createToken('introspect-service', ['introspect'])->plainTextToken;
    $payload = ['api_key' => 'uak_fakeprefix_'.str_repeat('b', 64)];

    $headers = [
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$servicePat}",
    ];

    $this->withHeaders($headers)->postJson('/api/auth/api-keys/introspect', $payload)->assertOk();
    $this->withHeaders($headers)->postJson('/api/auth/api-keys/introspect', $payload)->assertOk();
    $this->withHeaders($headers)->postJson('/api/auth/api-keys/introspect', $payload)->assertStatus(429);
});

test('introspection returns inactive when key owner is suspended', function () {
    $signup = $this->withHeaders([
        'project-id' => $this->project->uuid,
    ])->postJson('/api/auth/signup', [
        'email' => 'suspended-key-owner@example.com',
        'password' => 'secret1234',
    ])->assertCreated();

    $userToken = (string) $signup->json('access_token');

    $created = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$userToken}",
    ])->postJson('/api/auth/api-keys', [
        'name' => 'Suspended owner key',
        'scopes' => ['read'],
    ])->assertCreated();

    $authUser = ProjectAuthUser::query()
        ->where('project_id', $this->project->id)
        ->where('email', 'suspended-key-owner@example.com')
        ->firstOrFail();

    $authUser->update(['suspended_at' => now()]);

    $servicePat = $this->project->createToken('introspect-service', ['introspect'])->plainTextToken;
    $rawKey = (string) $created->json('plain_text_key');

    $response = $this->withHeaders([
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$servicePat}",
    ])->postJson('/api/auth/api-keys/introspect', [
        'api_key' => $rawKey,
    ]);

    $response->assertOk()
        ->assertJsonPath('active', false)
        ->assertJsonPath('key_prefix', $created->json('key_prefix'))
        ->assertJsonPath('key_id', $created->json('id'));
});
