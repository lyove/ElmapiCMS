<?php

use App\Jobs\SendWebhookJob;
use App\Models\ContentEntry;
use App\Models\Project;
use App\Models\User;
use App\Models\Webhook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

use function Pest\Laravel\assertDatabaseHas;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);

    $this->token = $this->project
        ->createToken('link-translation-token', ['create', 'read', 'update', 'delete'])
        ->plainTextToken;
});

function linkTranslationHeaders(Project $project, string $token): array
{
    return [
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ];
}

test('content api link translation merges two entries into one group', function () {
    $collection = $this->project->collections()->create([
        'name' => 'Posts',
        'slug' => 'posts',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $collection->fields()->create([
        'project_id' => $this->project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    $en = $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Hello EN'],
        ])
        ->assertCreated();

    $fr = $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'fr',
            'state' => 'published',
            'data' => ['title' => 'Bonjour FR'],
        ])
        ->assertCreated();

    $enUuid = $en->json('uuid') ?? $en->json('data.uuid');
    $frUuid = $fr->json('uuid') ?? $fr->json('data.uuid');

    $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson("/api/posts/{$enUuid}/link-translation", [
            'translation_entry_uuid' => $frUuid,
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Translation linked successfully.');

    $groupId = ContentEntry::where('uuid', $enUuid)->value('translation_group_id');
    expect($groupId)->not->toBeNull();
    assertDatabaseHas('content_entries', [
        'uuid' => $frUuid,
        'translation_group_id' => $groupId,
    ]);
});

test('content api link translation rejects same locale', function () {
    $collection = $this->project->collections()->create([
        'name' => 'Posts',
        'slug' => 'posts',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $collection->fields()->create([
        'project_id' => $this->project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    $a = $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'A'],
        ])
        ->assertCreated();

    $b = $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'B'],
        ])
        ->assertCreated();

    $aUuid = $a->json('uuid') ?? $a->json('data.uuid');
    $bUuid = $b->json('uuid') ?? $b->json('data.uuid');

    $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson("/api/posts/{$aUuid}/link-translation", [
            'translation_entry_uuid' => $bUuid,
        ])
        ->assertStatus(422);
});

test('content api link translation dispatches content.updated webhooks for api source', function () {
    Queue::fake();

    $owner = User::factory()->create();

    Webhook::query()->create([
        'project_id' => $this->project->id,
        'name' => 'Link Hook',
        'url' => 'https://example.com/hook',
        'events' => ['content.updated'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
        'created_by' => $owner->id,
    ]);

    $collection = $this->project->collections()->create([
        'name' => 'Posts',
        'slug' => 'posts',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $collection->fields()->create([
        'project_id' => $this->project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    $en = $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Hello EN'],
        ])
        ->assertCreated();

    $fr = $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'fr',
            'state' => 'published',
            'data' => ['title' => 'Bonjour FR'],
        ])
        ->assertCreated();

    $enUuid = $en->json('uuid') ?? $en->json('data.uuid');
    $frUuid = $fr->json('uuid') ?? $fr->json('data.uuid');

    $this->withHeaders(linkTranslationHeaders($this->project, $this->token))
        ->postJson("/api/posts/{$enUuid}/link-translation", [
            'translation_entry_uuid' => $frUuid,
        ])
        ->assertOk();

    Queue::assertPushed(SendWebhookJob::class, 2);

    Queue::assertPushed(SendWebhookJob::class, function (SendWebhookJob $job) {
        return $job->payload['event'] === 'content.updated'
            && isset($job->payload['content_entry']);
    });
});

test('content api link translation requires update ability', function () {
    $readOnly = $this->project
        ->createToken('read-only', ['read'])
        ->plainTextToken;

    $this->withHeaders(linkTranslationHeaders($this->project, $readOnly))
        ->postJson('/api/posts/'.Str::uuid().'/link-translation', [
            'translation_entry_uuid' => (string) Str::uuid(),
        ])
        ->assertForbidden();
});
