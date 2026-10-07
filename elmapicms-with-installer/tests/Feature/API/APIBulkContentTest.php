<?php

use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\Field;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function bulkContentHeaders(Project $project, string $token): array
{
    return [
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ];
}

beforeEach(function () {
    $this->project = Project::factory()->create([
        'public_api' => false,
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);

    $this->token = $this->project
        ->createToken('bulk-content-token', ['create', 'read', 'update', 'delete'])
        ->plainTextToken;
});

test('bulk content create stores multiple entries', function () {
    $collection = Collection::create([
        'project_id' => $this->project->id,
        'name' => 'Posts',
        'slug' => 'posts',
        'is_singleton' => false,
        'order' => 1,
    ]);

    Field::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    $response = $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->postJson('/api/bulk/posts/entries', [
            'items' => [
                ['locale' => 'en', 'state' => 'published', 'data' => ['title' => 'First']],
                ['locale' => 'fr', 'state' => 'draft', 'data' => ['title' => 'Second']],
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('message', 'Bulk content created successfully.')
        ->assertJsonCount(2, 'data');

    expect(ContentEntry::query()->where('collection_id', $collection->id)->count())->toBe(2);
});

test('bulk content create is atomic when singleton constraints fail', function () {
    $collection = Collection::create([
        'project_id' => $this->project->id,
        'name' => 'Settings',
        'slug' => 'settings',
        'is_singleton' => true,
        'order' => 1,
    ]);

    Field::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'type' => 'text',
        'label' => 'Site Name',
        'name' => 'site_name',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->postJson('/api/bulk/settings/entries', [
            'items' => [
                ['locale' => 'en', 'state' => 'published', 'data' => ['site_name' => 'Elmapi']],
                ['locale' => 'en', 'state' => 'published', 'data' => ['site_name' => 'Duplicate']],
            ],
        ])
        ->assertUnprocessable();

    expect(ContentEntry::query()->where('collection_id', $collection->id)->count())->toBe(0);
});

test('bulk content create auto-links singleton entries across locales', function () {
    $collection = Collection::create([
        'project_id' => $this->project->id,
        'name' => 'Globals',
        'slug' => 'globals',
        'is_singleton' => true,
        'order' => 1,
    ]);

    Field::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'type' => 'text',
        'label' => 'Site Name',
        'name' => 'site_name',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->postJson('/api/bulk/globals/entries', [
            'items' => [
                ['locale' => 'en', 'state' => 'published', 'data' => ['site_name' => 'EN']],
                ['locale' => 'fr', 'state' => 'published', 'data' => ['site_name' => 'FR']],
            ],
        ])
        ->assertCreated();

    $entries = ContentEntry::query()->where('collection_id', $collection->id)->orderBy('locale')->get();
    expect($entries)->toHaveCount(2);
    expect($entries[0]->translation_group_id)->not->toBeNull()
        ->and($entries[0]->translation_group_id)->toBe($entries[1]->translation_group_id);
});

test('bulk content update is atomic when one uuid is missing', function () {
    $collection = Collection::create([
        'project_id' => $this->project->id,
        'name' => 'Posts',
        'slug' => 'posts',
        'is_singleton' => false,
        'order' => 1,
    ]);

    Field::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    $entry = $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Original title'],
        ])
        ->assertCreated();

    $uuid = $entry->json('data.uuid') ?? $entry->json('uuid');

    $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->patchJson('/api/bulk/posts/entries', [
            'items' => [
                ['uuid' => $uuid, 'data' => ['title' => 'Updated title']],
                ['uuid' => '00000000-0000-0000-0000-000000000000', 'data' => ['title' => 'Missing']],
            ],
        ])
        ->assertUnprocessable();

    $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->getJson("/api/posts/{$uuid}?state=published")
        ->assertOk()
        ->assertJsonPath('fields.title', 'Original title');
});

test('bulk content delete soft deletes entries', function () {
    $collection = Collection::create([
        'project_id' => $this->project->id,
        'name' => 'Posts',
        'slug' => 'posts',
        'is_singleton' => false,
        'order' => 1,
    ]);

    Field::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    $first = $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'First'],
        ])
        ->assertCreated();
    $second = $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Second'],
        ])
        ->assertCreated();

    $uuids = [
        $first->json('data.uuid') ?? $first->json('uuid'),
        $second->json('data.uuid') ?? $second->json('uuid'),
    ];

    $this->withHeaders(bulkContentHeaders($this->project, $this->token))
        ->deleteJson('/api/bulk/posts/entries', ['uuids' => $uuids])
        ->assertOk()
        ->assertJsonPath('count', 2)
        ->assertJsonPath('force', false);

    foreach ($uuids as $uuid) {
        $entryId = ContentEntry::query()->withTrashed()->where('uuid', $uuid)->value('id');
        $this->assertSoftDeleted('content_entries', ['id' => $entryId]);
    }
});

test('bulk content create requires create ability', function () {
    Collection::create([
        'project_id' => $this->project->id,
        'name' => 'Posts',
        'slug' => 'posts',
        'is_singleton' => false,
        'order' => 1,
    ]);

    $readOnlyToken = $this->project
        ->createToken('bulk-content-read-only', ['read'])
        ->plainTextToken;

    $this->withHeaders(bulkContentHeaders($this->project, $readOnlyToken))
        ->postJson('/api/bulk/posts/entries', [
            'items' => [
                ['data' => ['title' => 'Nope']],
            ],
        ])
        ->assertForbidden();
});
