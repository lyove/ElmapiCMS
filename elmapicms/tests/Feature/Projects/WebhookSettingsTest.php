<?php

use App\Models\Project;
use App\Models\User;
use App\Models\Webhook;
use App\Models\WebhookLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function webhookPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Content Hook',
        'description' => 'Dispatch content changes',
        'url' => 'https://example.com/webhook',
        'secret' => 'secret123',
        'events' => ['content.created'],
        'sources' => ['content'],
        'payload' => true,
        'status' => true,
        'collection_ids' => [],
    ], $overrides);
}

function grantWebhookPermission(User $user): void
{
    Permission::findOrCreate('access_webhooks_settings', 'web');
    $user->givePermissionTo('access_webhooks_settings');
}

test('webhook endpoints require webhook settings permission', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->get(route('projects.settings.webhooks.index', ['project' => $project], absolute: false))
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('projects.settings.webhooks.store', ['project' => $project], absolute: false), webhookPayload())
        ->assertForbidden();
});

test('non members cannot access webhook endpoints even with permission', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    grantWebhookPermission($user);

    $this->actingAs($user)
        ->get(route('projects.settings.webhooks.index', ['project' => $project], absolute: false))
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('projects.settings.webhooks.store', ['project' => $project], absolute: false), webhookPayload())
        ->assertForbidden();
});

test('authorized member can list webhooks for project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantWebhookPermission($user);

    $webhook = Webhook::create([
        'project_id' => $project->id,
        'name' => 'Project Hook',
        'description' => null,
        'url' => 'https://example.com/listen',
        'secret' => null,
        'events' => ['content.updated'],
        'sources' => ['content'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get(route('projects.settings.webhooks.index', ['project' => $project], absolute: false));

    $response->assertOk();
    $response->assertJsonCount(1);
    $response->assertJsonPath('0.id', $webhook->id);
    $response->assertJsonPath('0.name', 'Project Hook');
});

test('authorized member can create webhook with collection bindings', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantWebhookPermission($user);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $response = $this->actingAs($user)
        ->post(route('projects.settings.webhooks.store', ['project' => $project], absolute: false), webhookPayload([
            'collection_ids' => [$collection->id],
        ]));

    $response->assertOk();
    $response->assertJsonPath('name', 'Content Hook');
    $response->assertJsonPath('url', 'https://example.com/webhook');

    $createdWebhook = Webhook::query()->latest('id')->firstOrFail();
    $this->assertDatabaseHas('webhooks', [
        'id' => $createdWebhook->id,
        'project_id' => $project->id,
        'created_by' => $user->id,
    ]);
    $this->assertDatabaseHas('webhook_collections', [
        'webhook_id' => $createdWebhook->id,
        'collection_id' => $collection->id,
    ]);
});

test('authorized member can create webhook bound to all project collections', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantWebhookPermission($user);

    $firstCollection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $secondCollection = $project->collections()->create([
        'name' => 'Pages',
        'slug' => 'pages',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $response = $this->actingAs($user)
        ->post(route('projects.settings.webhooks.store', ['project' => $project], absolute: false), webhookPayload([
            'collection_ids' => [$firstCollection->id, $secondCollection->id],
        ]));

    $response->assertOk();

    $createdWebhook = Webhook::query()->latest('id')->firstOrFail();
    expect($createdWebhook->collections()->pluck('collections.id')->sort()->values()->all())
        ->toBe([$firstCollection->id, $secondCollection->id]);
});

test('webhook create validates required payload', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantWebhookPermission($user);

    $response = $this->actingAs($user)
        ->post(route('projects.settings.webhooks.store', ['project' => $project], absolute: false), [
            'name' => '',
            'url' => 'invalid-url',
            'events' => [],
            'sources' => [],
        ]);

    $response->assertInvalid(['name', 'url', 'events', 'sources']);
});

test('authorized member can update webhook and sync collections', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantWebhookPermission($user);

    $firstCollection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $secondCollection = $project->collections()->create([
        'name' => 'Pages',
        'slug' => 'pages',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $webhook = Webhook::create([
        'project_id' => $project->id,
        'name' => 'Old Hook Name',
        'description' => 'Old',
        'url' => 'https://example.com/old',
        'secret' => 'secret123',
        'events' => ['content.updated'],
        'sources' => ['content'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);
    $webhook->collections()->sync([$firstCollection->id]);

    $response = $this->actingAs($user)
        ->put(route('projects.settings.webhooks.update', ['project' => $project, 'webhook' => $webhook], absolute: false), webhookPayload([
            'name' => 'Updated Hook Name',
            'url' => 'https://example.com/new',
            'collection_ids' => [$secondCollection->id],
        ]));

    $response->assertOk();
    $response->assertJsonPath('name', 'Updated Hook Name');

    $webhook->refresh();
    expect($webhook->name)->toBe('Updated Hook Name');
    expect($webhook->url)->toBe('https://example.com/new');

    $this->assertDatabaseMissing('webhook_collections', [
        'webhook_id' => $webhook->id,
        'collection_id' => $firstCollection->id,
    ]);
    $this->assertDatabaseHas('webhook_collections', [
        'webhook_id' => $webhook->id,
        'collection_id' => $secondCollection->id,
    ]);
});

test('webhook update and delete return 404 when webhook belongs to another project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $project->members()->attach($user->id);
    $otherProject->members()->attach($user->id);
    grantWebhookPermission($user);

    $foreignWebhook = Webhook::create([
        'project_id' => $otherProject->id,
        'name' => 'Foreign Hook',
        'description' => null,
        'url' => 'https://example.com/foreign',
        'secret' => null,
        'events' => ['content.created'],
        'sources' => ['content'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->put(route('projects.settings.webhooks.update', ['project' => $project, 'webhook' => $foreignWebhook], absolute: false), webhookPayload())
        ->assertNotFound();

    $this->actingAs($user)
        ->delete(route('projects.settings.webhooks.destroy', ['project' => $project, 'webhook' => $foreignWebhook], absolute: false))
        ->assertNotFound();
});

test('authorized member can delete webhook with logs and collection pivots cleanup', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantWebhookPermission($user);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $webhook = Webhook::create([
        'project_id' => $project->id,
        'name' => 'Delete Hook',
        'description' => null,
        'url' => 'https://example.com/delete',
        'secret' => null,
        'events' => ['content.deleted'],
        'sources' => ['content'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);
    $webhook->collections()->sync([$collection->id]);
    WebhookLog::create([
        'project_uuid' => $project->uuid,
        'webhook_id' => $webhook->id,
        'action' => 'content.deleted',
        'url' => 'https://example.com/delete',
        'status' => '200',
        'request' => ['a' => 1],
        'response' => ['ok' => true],
    ]);

    $response = $this->actingAs($user)
        ->delete(route('projects.settings.webhooks.destroy', ['project' => $project, 'webhook' => $webhook], absolute: false));

    $response->assertOk();
    $response->assertJsonPath('message', 'Deleted');

    $this->assertDatabaseMissing('webhooks', ['id' => $webhook->id]);
    $this->assertDatabaseMissing('webhook_logs', ['webhook_id' => $webhook->id]);
    $this->assertDatabaseMissing('webhook_collections', ['webhook_id' => $webhook->id]);
});

test('authorized member can open webhook logs page and gets 404 for cross project webhook', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $project->members()->attach($user->id);
    $otherProject->members()->attach($user->id);
    grantWebhookPermission($user);

    $webhook = Webhook::create([
        'project_id' => $project->id,
        'name' => 'Log Hook',
        'description' => null,
        'url' => 'https://example.com/logs',
        'secret' => null,
        'events' => ['content.updated'],
        'sources' => ['content'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);
    WebhookLog::create([
        'project_uuid' => $project->uuid,
        'webhook_id' => $webhook->id,
        'action' => 'content.updated',
        'url' => 'https://example.com/logs',
        'status' => '200',
        'request' => ['payload' => true],
        'response' => ['ok' => true],
    ]);

    $this->actingAs($user)
        ->get(route('projects.settings.webhooks.logs', ['project' => $project, 'webhook' => $webhook], absolute: false))
        ->assertOk();

    $foreignWebhook = Webhook::create([
        'project_id' => $otherProject->id,
        'name' => 'Foreign Log Hook',
        'description' => null,
        'url' => 'https://example.com/foreign-logs',
        'secret' => null,
        'events' => ['content.updated'],
        'sources' => ['content'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->get(route('projects.settings.webhooks.logs', ['project' => $project, 'webhook' => $foreignWebhook], absolute: false))
        ->assertNotFound();
});

test('webhook logs page paginates results', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantWebhookPermission($user);

    $webhook = Webhook::create([
        'project_id' => $project->id,
        'name' => 'Paged Hook',
        'description' => null,
        'url' => 'https://example.com/paged',
        'secret' => null,
        'events' => ['content.updated'],
        'sources' => ['cms'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    for ($i = 0; $i < 26; $i++) {
        WebhookLog::create([
            'project_uuid' => $project->uuid,
            'webhook_id' => $webhook->id,
            'action' => 'content.updated',
            'url' => 'https://example.com/paged',
            'status' => '200',
            'request' => [],
            'response' => ['index' => $i],
        ]);
    }

    $logsUrl = route('projects.settings.webhooks.logs', ['project' => $project, 'webhook' => $webhook], absolute: false);

    $this->actingAs($user)
        ->get($logsUrl)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Projects/Settings/WebhookLogs')
            ->where('logs.current_page', 1)
            ->where('logs.last_page', 2)
            ->has('logs.data', 25));

    $this->actingAs($user)
        ->get($logsUrl.'?page=2')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('logs.current_page', 2)
            ->has('logs.data', 1));
});
