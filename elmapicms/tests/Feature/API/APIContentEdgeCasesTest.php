<?php

use App\Models\Asset;
use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\Field;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function edgeApiHeaders(Project $project, string $token): array
{
    return [
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ];
}

function edgeCollection(Project $project, string $name, string $slug, bool $singleton = false): Collection
{
    return Collection::create([
        'project_id' => $project->id,
        'name' => $name,
        'slug' => $slug,
        'is_singleton' => $singleton,
        'order' => 1,
    ]);
}

function edgeField(
    Project $project,
    Collection $collection,
    string $type,
    string $name,
    int $order,
    array $options = [],
    ?int $parentFieldId = null
): Field {
    return Field::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'type' => $type,
        'label' => ucfirst($name),
        'name' => $name,
        'order' => $order,
        'options' => $options,
        'parent_field_id' => $parentFieldId,
    ]);
}

beforeEach(function () {
    $this->project = Project::factory()->create([
        'public_api' => false,
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);

    $this->token = $this->project
        ->createToken('content-edge-token', ['create', 'read', 'update', 'delete'])
        ->plainTextToken;
});

test('api content store rejects cross project media and relation references', function () {
    $relatedCollection = edgeCollection($this->project, 'Related', 'related');
    $articles = edgeCollection($this->project, 'Articles', 'articles');
    edgeField($this->project, $articles, 'text', 'title', 1);
    edgeField($this->project, $articles, 'media', 'gallery', 2, ['media' => ['type' => 2]]);
    edgeField($this->project, $articles, 'relation', 'related_item', 3, ['relation' => ['type' => 1, 'collection_id' => $relatedCollection->id]]);

    $otherProject = Project::factory()->create([
        'public_api' => false,
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $otherRelated = edgeCollection($otherProject, 'Other Related', 'other-related');
    edgeField($otherProject, $otherRelated, 'text', 'name', 1);

    $foreignAsset = Asset::create([
        'project_id' => $otherProject->id,
        'filename' => 'foreign.webp',
        'original_filename' => 'foreign.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 123,
        'disk' => 'public',
        'path' => "projects/{$otherProject->uuid}/assets/foreign.webp",
    ]);
    $foreignEntry = ContentEntry::create([
        'project_id' => $otherProject->id,
        'collection_id' => $otherRelated->id,
        'locale' => 'en',
        'state' => 'published',
        'published_at' => now(),
        'translation_group_id' => (string) Str::uuid(),
    ]);

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/articles', [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'title' => 'Cross project media should be rejected',
                'gallery' => [$foreignAsset->uuid],
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['data.gallery']);

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/articles', [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'title' => 'Cross project relation should be rejected',
                'related_item' => $foreignEntry->uuid,
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['data.related_item']);
});

test('api content update rejects cross project media and relation references', function () {
    $relatedCollection = edgeCollection($this->project, 'Related', 'related');
    $articles = edgeCollection($this->project, 'Articles', 'articles');
    edgeField($this->project, $articles, 'text', 'title', 1);
    edgeField($this->project, $articles, 'media', 'gallery', 2, ['media' => ['type' => 2]]);
    edgeField($this->project, $articles, 'relation', 'related_item', 3, ['relation' => ['type' => 1, 'collection_id' => $relatedCollection->id]]);

    $localRelatedEntry = ContentEntry::create([
        'project_id' => $this->project->id,
        'collection_id' => $relatedCollection->id,
        'locale' => 'en',
        'state' => 'published',
        'published_at' => now(),
        'translation_group_id' => (string) Str::uuid(),
    ]);
    $localAsset = Asset::create([
        'project_id' => $this->project->id,
        'filename' => 'local.webp',
        'original_filename' => 'local.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 456,
        'disk' => 'public',
        'path' => "projects/{$this->project->uuid}/assets/local.webp",
    ]);

    $create = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/articles', [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'title' => 'Valid base entry',
                'gallery' => [$localAsset->uuid],
                'related_item' => $localRelatedEntry->uuid,
            ],
        ])
        ->assertCreated();
    $entryUuid = $create->json('data.uuid') ?? $create->json('uuid');

    $otherProject = Project::factory()->create([
        'public_api' => false,
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $otherRelated = edgeCollection($otherProject, 'Other Related', 'other-related');
    edgeField($otherProject, $otherRelated, 'text', 'name', 1);
    $foreignEntry = ContentEntry::create([
        'project_id' => $otherProject->id,
        'collection_id' => $otherRelated->id,
        'locale' => 'en',
        'state' => 'published',
        'published_at' => now(),
        'translation_group_id' => (string) Str::uuid(),
    ]);
    $foreignAsset = Asset::create([
        'project_id' => $otherProject->id,
        'filename' => 'foreign.webp',
        'original_filename' => 'foreign.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 123,
        'disk' => 'public',
        'path' => "projects/{$otherProject->uuid}/assets/foreign.webp",
    ]);

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->patchJson("/api/articles/{$entryUuid}", [
            'data' => [
                'gallery' => [$foreignAsset->uuid],
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['data.gallery']);

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->patchJson("/api/articles/{$entryUuid}", [
            'data' => [
                'related_item' => $foreignEntry->uuid,
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['data.related_item']);
});

test('api content update unique slug allows same entry value but rejects duplicates', function () {
    $articles = edgeCollection($this->project, 'Articles', 'articles');

    Field::create([
        'project_id' => $this->project->id,
        'collection_id' => $articles->id,
        'type' => 'slug',
        'label' => 'Slug',
        'name' => 'slug',
        'order' => 1,
        'validations' => [
            'unique' => [
                'status' => true,
                'message' => 'Slug already exists',
            ],
        ],
    ]);

    $entryA = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/articles', [
            'locale' => 'en',
            'state' => 'draft',
            'data' => [
                'slug' => 'entry-a',
            ],
        ])
        ->assertCreated();

    $entryB = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/articles', [
            'locale' => 'en',
            'state' => 'draft',
            'data' => [
                'slug' => 'entry-b',
            ],
        ])
        ->assertCreated();

    $entryAUuid = $entryA->json('data.uuid') ?? $entryA->json('uuid');
    $entryBUuid = $entryB->json('data.uuid') ?? $entryB->json('uuid');

    expect($entryAUuid)->not->toBeEmpty();
    expect($entryBUuid)->not->toBeEmpty();

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->patchJson("/api/articles/{$entryAUuid}", [
            'data' => [
                'slug' => 'entry-a',
            ],
        ])
        ->assertOk();

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->patchJson("/api/articles/{$entryAUuid}", [
            'data' => [
                'slug' => 'entry-b',
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['data.slug']);
});

test('api content count returns filtered total and ignores limit offset window', function () {
    $products = edgeCollection($this->project, 'Products', 'products');
    edgeField($this->project, $products, 'text', 'title', 1);
    edgeField($this->project, $products, 'boolean', 'in_stock', 2);

    foreach ([
        ['A', true],
        ['B', true],
        ['C', false],
        ['D', true],
        ['E', false],
    ] as [$title, $inStock]) {
        $this->withHeaders(edgeApiHeaders($this->project, $this->token))
            ->postJson('/api/products', [
                'locale' => 'en',
                'state' => 'published',
                'data' => [
                    'title' => $title,
                    'in_stock' => $inStock,
                ],
            ])
            ->assertCreated();
    }

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson('/api/products?where[in_stock]=true&count=1&limit=1&offset=2')
        ->assertOk()
        ->assertJsonPath('count', 3);
});

test('api content exclude works for grouped fields and group children', function () {
    $posts = edgeCollection($this->project, 'Posts', 'posts');
    edgeField($this->project, $posts, 'text', 'title', 1);
    $group = edgeField($this->project, $posts, 'group', 'extras', 2, ['repeatable' => true]);
    edgeField($this->project, $posts, 'text', 'subtitle', 3, parentFieldId: $group->id);
    edgeField($this->project, $posts, 'text', 'notes', 4, parentFieldId: $group->id);

    $store = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'title' => 'Grouped entry',
                'extras' => [
                    ['subtitle' => 'Block one', 'notes' => 'One note'],
                ],
            ],
        ])
        ->assertCreated();

    $entryUuid = $store->json('data.uuid') ?? $store->json('uuid');

    $excludeChild = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson("/api/posts/{$entryUuid}?exclude=subtitle")
        ->assertOk();

    expect($excludeChild->json('fields.extras.0'))->toBeArray();
    expect($excludeChild->json('fields.extras.0.subtitle'))->toBeNull();
    expect($excludeChild->json('fields.extras.0.notes'))->toBe('One note');

    $excludeGroup = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson("/api/posts/{$entryUuid}?exclude=extras")
        ->assertOk();

    expect($excludeGroup->json('fields'))->not->toHaveKey('extras');
});

test('api content sort by custom field is stable across paginated pages', function () {
    $items = edgeCollection($this->project, 'Items', 'items');
    edgeField($this->project, $items, 'text', 'title', 1);
    edgeField($this->project, $items, 'number', 'rank', 2);

    foreach ([
        ['A', 2],
        ['B', null],
        ['C', 1],
        ['D', null],
        ['E', 3],
    ] as [$title, $rank]) {
        $payload = [
            'title' => $title,
        ];
        if ($rank !== null) {
            $payload['rank'] = $rank;
        }

        $this->withHeaders(edgeApiHeaders($this->project, $this->token))
            ->postJson('/api/items', [
                'locale' => 'en',
                'state' => 'published',
                'data' => $payload,
            ])
            ->assertCreated();
    }

    $page1 = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson('/api/items?paginate=2&sort=rank:asc&page=1')
        ->assertOk();
    $page2 = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson('/api/items?paginate=2&sort=rank:asc&page=2')
        ->assertOk();
    $page3 = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson('/api/items?paginate=2&sort=rank:asc&page=3')
        ->assertOk();

    expect($page1->json('data.0.fields.title'))->toBe('C');
    expect($page1->json('data.1.fields.title'))->toBe('A');
    expect($page2->json('data.0.fields.title'))->toBe('E');

    $allTitles = array_merge(
        collect($page1->json('data'))->pluck('fields.title')->all(),
        collect($page2->json('data'))->pluck('fields.title')->all(),
        collect($page3->json('data'))->pluck('fields.title')->all(),
    );

    expect($allTitles)->toHaveCount(5);
    expect(array_unique($allTitles))->toHaveCount(5);
});

test('api content sort by custom field with hyphen in field name does not error', function () {
    $pages = edgeCollection($this->project, 'Pages', 'pages');
    edgeField($this->project, $pages, 'text', 'title', 1);
    edgeField($this->project, $pages, 'number', 'sort-order', 2);

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/pages', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Home', 'sort-order' => 1],
        ])
        ->assertCreated();

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson('/api/pages?paginate=10&sort=sort-order:asc')
        ->assertOk()
        ->assertJsonPath('data.0.fields.title', 'Home');
});

test('api content translation respects state matrix', function () {
    $posts = edgeCollection($this->project, 'Posts', 'posts');
    edgeField($this->project, $posts, 'text', 'title', 1);

    $enStore = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Published EN'],
        ])
        ->assertCreated();
    $frStore = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'fr',
            'state' => 'draft',
            'data' => ['title' => 'Draft FR'],
        ])
        ->assertCreated();

    $enEntry = ContentEntry::query()->where('uuid', $enStore->json('data.uuid') ?? $enStore->json('uuid'))->firstOrFail();
    $frEntry = ContentEntry::query()->where('uuid', $frStore->json('data.uuid') ?? $frStore->json('uuid'))->firstOrFail();
    $groupId = (string) Str::uuid();
    $enEntry->update(['translation_group_id' => $groupId]);
    $frEntry->update(['translation_group_id' => $groupId]);

    // default state is published, so draft FR translation should be hidden
    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson("/api/posts/{$enEntry->uuid}?translation_locale=fr")
        ->assertNotFound();

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson("/api/posts/{$enEntry->uuid}?translation_locale=fr&state=draft")
        ->assertOk()
        ->assertJsonPath('locale', 'fr')
        ->assertJsonPath('fields.title', 'Draft FR');

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson("/api/posts/{$enEntry->uuid}?translation_locale=fr&state=published")
        ->assertNotFound()
        ->assertJsonPath('message', "Translation not found for locale 'fr'.");
});

test('api singleton defaults to project default locale when locale is omitted', function () {
    $settings = edgeCollection($this->project, 'Settings', 'settings', true);
    edgeField($this->project, $settings, 'text', 'site_name', 1);

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/settings', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['site_name' => 'Default Locale Site'],
        ])
        ->assertCreated();

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/settings', [
            'locale' => 'fr',
            'state' => 'published',
            'data' => ['site_name' => 'French Locale Site'],
        ])
        ->assertCreated();

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson('/api/settings')
        ->assertOk()
        ->assertJsonPath('locale', 'en')
        ->assertJsonPath('fields.site_name', 'Default Locale Site');

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson('/api/settings?locale=fr')
        ->assertOk()
        ->assertJsonPath('locale', 'fr')
        ->assertJsonPath('fields.site_name', 'French Locale Site');
});

test('api collection listing does not stack overflow on self-referential relation fields', function () {
    $peers = edgeCollection($this->project, 'Peers', 'peers');
    edgeField($this->project, $peers, 'text', 'title', 1);
    edgeField($this->project, $peers, 'relation', 'buddy', 2, [
        'relation' => ['type' => 1, 'collection_id' => $peers->id],
    ]);

    $a = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/peers', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Alpha'],
        ])
        ->assertCreated();

    $b = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson('/api/peers', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Bravo'],
        ])
        ->assertCreated();

    $uuidA = $a->json('data.uuid') ?? $a->json('uuid');
    $uuidB = $b->json('data.uuid') ?? $b->json('uuid');

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->patchJson("/api/peers/{$uuidA}", [
            'data' => [
                'title' => 'Alpha',
                'buddy' => $uuidB,
            ],
        ])
        ->assertOk();

    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->patchJson("/api/peers/{$uuidB}", [
            'data' => [
                'title' => 'Bravo',
                'buddy' => $uuidA,
            ],
        ])
        ->assertOk();

    // List uses published snapshots; patch only updates draft field values until publish.
    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson("/api/peers/{$uuidA}/publish")
        ->assertOk();
    $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->postJson("/api/peers/{$uuidB}/publish")
        ->assertOk();

    $list = $this->withHeaders(edgeApiHeaders($this->project, $this->token))
        ->getJson('/api/peers')
        ->assertOk();

    $rows = $list->json();
    $rowA = collect(is_array($rows) && array_is_list($rows) ? $rows : ($rows['data'] ?? []))->firstWhere('uuid', $uuidA);
    expect($rowA['fields']['buddy']['fields']['title'])->toBe('Bravo');
    // Cycle: A -> B -> A returns a stub (empty fields) for the second A.
    expect($rowA['fields']['buddy']['fields']['buddy']['fields'])->toBe([]);
    expect($rowA['fields']['buddy']['fields']['buddy']['uuid'])->toBe($uuidA);
});
