<?php

use App\Models\Collection;
use App\Models\Project;
use App\Models\User;
use App\Models\Webhook;
use App\Models\WebhookLog;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function webhookApiHeaders(Project $project, string $token): array
{
    return [
        'project-id' => $project->uuid,
        'Authorization' => 'Bearer '.$token,
    ];
}

function webhookApiContext(): array
{
    $user = User::factory()->create();
    $project = Project::factory()->create(['public_api' => false]);
    $project->members()->attach($user->id);

    $adminToken = $project->createToken('admin-token', ['read', 'create', 'update', 'delete', 'admin'])->plainTextToken;
    $readToken = $project->createToken('read-token', ['read'])->plainTextToken;

    return [$user, $project, $adminToken, $readToken];
}

it('routes /api/webhooks to webhook controller before collection catch-all', function () {
    [, $project, $adminToken] = webhookApiContext();

    $response = $this->getJson('/api/webhooks', webhookApiHeaders($project, $adminToken));

    $response->assertSuccessful();
    $response->assertExactJson([]);
});

it('forbids webhook management without admin ability', function () {
    [, $project, , $readToken] = webhookApiContext();

    $response = $this->postJson('/api/webhooks', [
        'name' => 'API Hook',
        'url' => 'https://example.com/webhook',
        'secret' => 'secret123',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
    ], webhookApiHeaders($project, $readToken));

    $response->assertForbidden();
});

it('creates shows updates and deletes webhook by uuid', function () {
    [, $project, $adminToken] = webhookApiContext();

    $collection = Collection::query()->create([
        'project_id' => $project->id,
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $createResponse = $this->postJson('/api/webhooks', [
        'name' => 'API Hook',
        'description' => 'created via api',
        'url' => 'https://example.com/webhook',
        'secret' => 'secret123',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
        'collection_ids' => [$collection->id],
    ], webhookApiHeaders($project, $adminToken));

    $createResponse->assertSuccessful()
        ->assertJsonPath('name', 'API Hook');

    $uuid = $createResponse->json('uuid');
    expect($uuid)->not->toBeEmpty();

    $this->getJson("/api/webhooks/{$uuid}", webhookApiHeaders($project, $adminToken))
        ->assertSuccessful()
        ->assertJsonPath('uuid', $uuid);

    $this->putJson("/api/webhooks/{$uuid}", [
        'name' => 'API Hook Updated',
        'description' => 'updated via api',
        'url' => 'https://example.com/updated',
        'secret' => 'secret123',
        'events' => ['content.updated', 'auth.login.success'],
        'sources' => ['api', 'cms'],
        'payload' => false,
        'status' => true,
        'collection_ids' => [$collection->id],
    ], webhookApiHeaders($project, $adminToken))
        ->assertSuccessful()
        ->assertJsonPath('name', 'API Hook Updated');

    $webhook = Webhook::query()->where('uuid', $uuid)->firstOrFail();
    WebhookLog::query()->create([
        'project_uuid' => $project->uuid,
        'webhook_id' => $webhook->id,
        'action' => 'content.updated',
        'url' => 'https://example.com/updated',
        'status' => '200',
        'request' => ['ok' => true],
        'response' => ['status' => '200', 'body' => 'ok'],
    ]);

    $this->getJson("/api/webhooks/{$uuid}/logs", webhookApiHeaders($project, $adminToken))
        ->assertSuccessful()
        ->assertJsonPath('data.0.action', 'content.updated');

    $this->deleteJson("/api/webhooks/{$uuid}", [], webhookApiHeaders($project, $adminToken))
        ->assertNoContent();

    $this->assertDatabaseMissing('webhooks', ['uuid' => $uuid]);
});

it('rejects webhook URLs that point to disallowed hosts', function () {
    [, $project, $adminToken] = webhookApiContext();

    $this->postJson('/api/webhooks', [
        'name' => 'Bad Hook',
        'url' => 'https://127.0.0.1/webhook',
        'secret' => 'secret123',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
    ], webhookApiHeaders($project, $adminToken))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['url']);
});

it('preserves webhook secret when omitted from update payload', function () {
    [, $project, $adminToken] = webhookApiContext();

    $createResponse = $this->postJson('/api/webhooks', [
        'name' => 'Secret Hook',
        'url' => 'https://example.com/webhook',
        'secret' => 'original-secret',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
    ], webhookApiHeaders($project, $adminToken));

    $createResponse->assertSuccessful();
    $uuid = $createResponse->json('uuid');

    $this->putJson("/api/webhooks/{$uuid}", [
        'name' => 'Secret Hook Renamed',
        'description' => null,
        'url' => 'https://example.com/other',
        'events' => ['content.updated'],
        'sources' => ['api'],
        'payload' => false,
        'status' => true,
        'collection_ids' => [],
    ], webhookApiHeaders($project, $adminToken))
        ->assertSuccessful();

    $webhook = Webhook::query()->where('uuid', $uuid)->firstOrFail();
    expect($webhook->secret)->toBe('original-secret');
});

it('returns 404 when webhook belongs to another project', function () {
    [$user, $project, $adminToken] = webhookApiContext();
    $otherProject = Project::factory()->create(['public_api' => false]);
    $otherProject->members()->attach($user->id);

    $foreign = Webhook::query()->create([
        'project_id' => $otherProject->id,
        'name' => 'Foreign',
        'url' => 'https://example.com/foreign',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $this->getJson("/api/webhooks/{$foreign->uuid}", webhookApiHeaders($project, $adminToken))
        ->assertNotFound();
});

it('validates webhook request payload and reserved slug', function () {
    [, $project, $adminToken] = webhookApiContext();

    $invalidWebhook = $this->postJson('/api/webhooks', [
        'name' => '',
        'url' => 'not-a-url',
        'secret' => 'abc',
        'events' => ['unknown.event'],
        'sources' => ['unknown'],
    ], webhookApiHeaders($project, $adminToken));

    $invalidWebhook->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'url', 'secret', 'events.0', 'sources.0']);

    $invalidSlug = $this->postJson('/api/collections', [
        'name' => 'Reserved',
        'slug' => 'webhooks',
    ], webhookApiHeaders($project, $adminToken));

    $invalidSlug->assertStatus(422)
        ->assertJsonValidationErrors(['slug']);
});
