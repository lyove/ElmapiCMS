<?php

use App\Models\Asset;
use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\Field;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

function contentApiHeaders(Project $project, string $token): array
{
    return [
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ];
}

function contentApiEntryUuid(TestResponse $response): ?string
{
    return $response->json('data.uuid') ?? $response->json('uuid');
}

function createApiCollection(Project $project, string $name, string $slug, bool $isSingleton = false): Collection
{
    return Collection::create([
        'project_id' => $project->id,
        'name' => $name,
        'slug' => $slug,
        'is_singleton' => $isSingleton,
        'order' => 1,
    ]);
}

function createApiField(
    Project $project,
    Collection $collection,
    string $type,
    string $name,
    string $label,
    int $order,
    array $options = [],
    array $validations = [],
    ?int $parentFieldId = null
): Field {
    return Field::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'type' => $type,
        'label' => $label,
        'name' => $name,
        'order' => $order,
        'options' => $options,
        'validations' => $validations,
        'parent_field_id' => $parentFieldId,
    ]);
}

beforeEach(function () {
    Storage::fake('public');
    config(['filesystems.default' => 'public']);

    $this->project = Project::factory()->create([
        'disk' => 'public',
        'public_api' => false,
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);

    $this->token = $this->project
        ->createToken('content-comprehensive-token', ['create', 'read', 'update', 'delete'])
        ->plainTextToken;
});

test('content api stores and returns all major field types correctly', function () {
    $authors = createApiCollection($this->project, 'Authors', 'authors');
    $articles = createApiCollection($this->project, 'Articles', 'articles');

    createApiField($this->project, $authors, 'text', 'name', 'Name', 1);

    createApiField($this->project, $articles, 'text', 'title', 'Title', 1);
    createApiField($this->project, $articles, 'longtext', 'summary', 'Summary', 2);
    createApiField($this->project, $articles, 'richtext', 'body', 'Body', 3, ['editor' => ['outputFormat' => 'html']]);
    createApiField($this->project, $articles, 'slug', 'slug', 'Slug', 4);
    createApiField($this->project, $articles, 'email', 'contact_email', 'Contact Email', 5);
    createApiField($this->project, $articles, 'password', 'secret', 'Secret', 6);
    createApiField($this->project, $articles, 'number', 'price', 'Price', 7);
    createApiField($this->project, $articles, 'enumeration', 'tier', 'Tier', 8, ['enumeration' => ['multiple' => true]]);
    createApiField($this->project, $articles, 'boolean', 'featured', 'Featured', 9);
    createApiField($this->project, $articles, 'color', 'brand_color', 'Brand Color', 10);
    createApiField($this->project, $articles, 'date', 'publish_date', 'Publish Date', 11);
    createApiField($this->project, $articles, 'date', 'publish_window', 'Publish Window', 12, ['mode' => 'range', 'includeTime' => true]);
    createApiField($this->project, $articles, 'time', 'reading_time', 'Reading Time', 13);
    createApiField($this->project, $articles, 'json', 'metadata', 'Metadata', 14);
    createApiField($this->project, $articles, 'media', 'gallery', 'Gallery', 15, ['media' => ['type' => 2]]);
    createApiField($this->project, $articles, 'relation', 'author', 'Author', 16, ['relation' => ['type' => 1, 'collection_id' => $authors->id]]);

    $groupField = createApiField($this->project, $articles, 'group', 'extras', 'Extras', 17, ['repeatable' => true]);
    createApiField($this->project, $articles, 'text', 'subtitle', 'Subtitle', 18, parentFieldId: $groupField->id);
    createApiField($this->project, $articles, 'number', 'score', 'Score', 19, parentFieldId: $groupField->id);

    $authorEntry = ContentEntry::create([
        'project_id' => $this->project->id,
        'collection_id' => $authors->id,
        'locale' => 'en',
        'state' => 'published',
        'published_at' => now(),
    ]);

    $authorNameField = $authors->fields()->where('name', 'name')->firstOrFail();
    ContentFieldValue::create([
        'project_id' => $this->project->id,
        'collection_id' => $authors->id,
        'content_entry_id' => $authorEntry->id,
        'field_id' => $authorNameField->id,
        'field_type' => 'text',
        'text_value' => 'Jane Doe',
    ]);

    $asset = Asset::create([
        'project_id' => $this->project->id,
        'filename' => 'hero.webp',
        'original_filename' => 'hero.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 1024,
        'disk' => 'public',
        'path' => "projects/{$this->project->uuid}/assets/hero.webp",
    ]);

    $store = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/articles', [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'title' => 'Comprehensive API Entry',
                'summary' => 'Long text summary',
                'body' => '<p>Rich body</p>',
                'slug' => 'comprehensive-api-entry',
                'contact_email' => 'api@example.test',
                'secret' => 'super-secret-password',
                'price' => 99.5,
                'tier' => ['pro', 'enterprise'],
                'featured' => true,
                'brand_color' => '#11aa22',
                'publish_date' => '2026-03-15',
                'publish_window' => '2026-03-15 09:00:00 - 2026-03-20 18:00:00',
                'reading_time' => '08:30',
                'metadata' => ['layout' => 'grid', 'score' => 5],
                'gallery' => [$asset->uuid],
                'author' => $authorEntry->uuid,
                'extras' => [
                    ['subtitle' => 'Block A', 'score' => 7],
                    ['subtitle' => 'Block B', 'score' => 9],
                ],
            ],
        ])
        ->assertCreated();

    $entryUuid = contentApiEntryUuid($store);
    expect($entryUuid)->not->toBeNull();

    $show = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->getJson("/api/articles/{$entryUuid}?state=published")
        ->assertOk();

    $show->assertJsonPath('fields.title', 'Comprehensive API Entry');
    $show->assertJsonPath('fields.summary', 'Long text summary');
    $show->assertJsonPath('fields.body', '<p>Rich body</p>');
    $show->assertJsonPath('fields.slug', 'comprehensive-api-entry');
    $show->assertJsonPath('fields.contact_email', 'api@example.test');
    $show->assertJsonPath('fields.featured', true);
    $show->assertJsonPath('fields.brand_color', '#11aa22');
    $show->assertJsonPath('fields.reading_time', '08:30');
    $show->assertJsonPath('fields.metadata.layout', 'grid');
    $show->assertJsonPath('fields.gallery.0.uuid', (string) $asset->uuid);
    $show->assertJsonPath('fields.author.uuid', (string) $authorEntry->uuid);
    $show->assertJsonPath('fields.extras.0.subtitle', 'Block A');
    $show->assertJsonPath('fields.extras.1.score', 9);

    expect($show->json('fields'))->not->toHaveKey('secret');

    $secretField = $articles->fields()->where('name', 'secret')->firstOrFail();
    $savedSecret = ContentFieldValue::query()
        ->where('content_entry_id', ContentEntry::query()->where('uuid', $entryUuid)->firstOrFail()->id)
        ->where('field_id', $secretField->id)
        ->firstOrFail();

    expect(Hash::check('super-secret-password', $savedSecret->text_value))->toBeTrue();
});

test('content api supports locale filters and translation locale lookup', function () {
    $posts = createApiCollection($this->project, 'Posts', 'posts');
    createApiField($this->project, $posts, 'text', 'title', 'Title', 1);

    $enStore = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Hello'],
        ])
        ->assertCreated();

    $frStore = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'fr',
            'state' => 'published',
            'data' => ['title' => 'Bonjour'],
        ])
        ->assertCreated();

    $enEntry = ContentEntry::query()->where('uuid', contentApiEntryUuid($enStore))->firstOrFail();
    $frEntry = ContentEntry::query()->where('uuid', contentApiEntryUuid($frStore))->firstOrFail();
    $translationGroupId = (string) Str::uuid();
    $enEntry->update(['translation_group_id' => $translationGroupId]);
    $frEntry->update(['translation_group_id' => $translationGroupId]);

    $listFr = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->getJson('/api/posts?locale=fr&state=published')
        ->assertOk();

    $frPayload = $listFr->json();
    expect($frPayload)->toHaveCount(1);
    expect($frPayload[0]['locale'])->toBe('fr');
    expect($frPayload[0]['fields']['title'])->toBe('Bonjour');

    $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->getJson('/api/posts/'.$enEntry->uuid.'?translation_locale=fr&state=published')
        ->assertOk()
        ->assertJsonPath('uuid', $frEntry->uuid)
        ->assertJsonPath('locale', 'fr')
        ->assertJsonPath('fields.title', 'Bonjour');
});

test('content api translation locale returns not found when translation missing', function () {
    $posts = createApiCollection($this->project, 'Posts', 'posts');
    createApiField($this->project, $posts, 'text', 'title', 'Title', 1);

    $store = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Only English'],
        ])
        ->assertCreated();

    $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->getJson('/api/posts/'.contentApiEntryUuid($store).'?translation_locale=fr')
        ->assertNotFound()
        ->assertJsonPath('message', 'This entry has no translations linked.');
});

test('content api enforces singleton behavior per locale and isolates collections', function () {
    $settings = createApiCollection($this->project, 'Settings', 'settings', true);
    $posts = createApiCollection($this->project, 'Posts', 'posts');

    createApiField($this->project, $settings, 'text', 'site_name', 'Site Name', 1);
    createApiField($this->project, $posts, 'text', 'title', 'Title', 1);

    $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/settings', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['site_name' => 'Elmapi EN'],
        ])
        ->assertCreated();

    $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/settings', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['site_name' => 'Duplicate EN'],
        ])
        ->assertStatus(422);

    $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/settings', [
            'locale' => 'fr',
            'state' => 'published',
            'data' => ['site_name' => 'Elmapi FR'],
        ])
        ->assertCreated();

    $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/posts', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['title' => 'Normal post'],
        ])
        ->assertCreated();

    $settingsList = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->getJson('/api/settings?state=published')
        ->assertOk();

    $postsList = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->getJson('/api/posts?state=published')
        ->assertOk();

    expect($settingsList->json('locale'))->toBeIn(['en', 'fr']);
    expect($postsList->json())->toHaveCount(1);
    $postsList->assertJsonPath('0.fields.title', 'Normal post');
});

test('content api supports advanced filtering operators and relation filters', function () {
    $categories = createApiCollection($this->project, 'Categories', 'categories');
    $products = createApiCollection($this->project, 'Products', 'products');

    createApiField($this->project, $categories, 'text', 'name', 'Name', 1);

    createApiField($this->project, $products, 'text', 'title', 'Title', 1);
    createApiField($this->project, $products, 'number', 'price', 'Price', 2);
    createApiField($this->project, $products, 'boolean', 'in_stock', 'In Stock', 3);
    createApiField($this->project, $products, 'enumeration', 'tags', 'Tags', 4, ['enumeration' => ['multiple' => true]]);
    createApiField($this->project, $products, 'relation', 'category', 'Category', 5, ['relation' => ['type' => 1, 'collection_id' => $categories->id]]);

    $apparel = ContentEntry::create([
        'project_id' => $this->project->id,
        'collection_id' => $categories->id,
        'locale' => 'en',
        'state' => 'published',
        'published_at' => now(),
    ]);
    $footwear = ContentEntry::create([
        'project_id' => $this->project->id,
        'collection_id' => $categories->id,
        'locale' => 'en',
        'state' => 'published',
        'published_at' => now(),
    ]);
    $nameField = $categories->fields()->where('name', 'name')->firstOrFail();
    ContentFieldValue::create([
        'project_id' => $this->project->id,
        'collection_id' => $categories->id,
        'content_entry_id' => $apparel->id,
        'field_id' => $nameField->id,
        'field_type' => 'text',
        'text_value' => 'Apparel',
    ]);
    ContentFieldValue::create([
        'project_id' => $this->project->id,
        'collection_id' => $categories->id,
        'content_entry_id' => $footwear->id,
        'field_id' => $nameField->id,
        'field_type' => 'text',
        'text_value' => 'Footwear',
    ]);

    $requestHeaders = contentApiHeaders($this->project, $this->token);

    $this->withHeaders($requestHeaders)->postJson('/api/products', [
        'locale' => 'en',
        'state' => 'published',
        'data' => [
            'title' => 'Red Shirt',
            'price' => 80,
            'in_stock' => true,
            'tags' => ['sale', 'summer'],
            'category' => $apparel->uuid,
        ],
    ])->assertCreated();

    $this->withHeaders($requestHeaders)->postJson('/api/products', [
        'locale' => 'en',
        'state' => 'published',
        'data' => [
            'title' => 'Blue Jacket',
            'price' => 140,
            'in_stock' => false,
            'tags' => ['winter'],
            'category' => $apparel->uuid,
        ],
    ])->assertCreated();

    $this->withHeaders($requestHeaders)->postJson('/api/products', [
        'locale' => 'en',
        'state' => 'draft',
        'data' => [
            'title' => 'Running Shoes',
            'price' => 110,
            'in_stock' => true,
            'tags' => ['sport'],
            'category' => $footwear->uuid,
        ],
    ])->assertCreated();

    $betweenAndBoolean = $this->withHeaders($requestHeaders)
        ->getJson('/api/products?state=published&where[price][between]=70,120&where[in_stock]=true&sort=price:asc')
        ->assertOk();

    expect($betweenAndBoolean->json())->toHaveCount(1);
    $betweenAndBoolean->assertJsonPath('0.fields.title', 'Red Shirt');

    $orFilter = $this->withHeaders($requestHeaders)
        ->getJson('/api/products?state=published&where[or][0][title][like]=shirt&where[or][1][title][like]=jacket')
        ->assertOk();

    expect($orFilter->json())->toHaveCount(2);

    $relationFilter = $this->withHeaders($requestHeaders)
        ->getJson('/api/products?state=published&where[category][name]=Apparel')
        ->assertOk();

    expect($relationFilter->json())->toHaveCount(2);
});

test('content api auto-links singleton entries across locales', function () {
    $this->project->update([
        'locales' => ['en', 'fr', 'tr'],
        'default_locale' => 'en',
    ]);

    $globals = createApiCollection($this->project, 'Globals', 'globals', true);
    createApiField($this->project, $globals, 'text', 'site_name', 'Site Name', 1);

    $en = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/globals', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['site_name' => 'EN'],
        ])
        ->assertCreated();

    $fr = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/globals', [
            'locale' => 'fr',
            'state' => 'published',
            'data' => ['site_name' => 'FR'],
        ])
        ->assertCreated();

    $tr = $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/globals', [
            'locale' => 'tr',
            'state' => 'published',
            'data' => ['site_name' => 'TR'],
        ])
        ->assertCreated();

    $enUuid = contentApiEntryUuid($en);
    $enModel = ContentEntry::where('uuid', $enUuid)->firstOrFail();
    $frModel = ContentEntry::where('uuid', contentApiEntryUuid($fr))->firstOrFail();
    $trModel = ContentEntry::where('uuid', contentApiEntryUuid($tr))->firstOrFail();

    expect($enModel->translation_group_id)->not->toBeNull();
    expect($enModel->translation_group_id)->toBe($frModel->translation_group_id)
        ->and($frModel->translation_group_id)->toBe($trModel->translation_group_id);

    $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->getJson("/api/globals/{$enUuid}?translation_locale=fr&state=published")
        ->assertOk()
        ->assertJsonPath('fields.site_name', 'FR');

    $this->withHeaders(contentApiHeaders($this->project, $this->token))
        ->postJson('/api/globals', [
            'locale' => 'en',
            'state' => 'published',
            'data' => ['site_name' => 'Duplicate'],
        ])
        ->assertStatus(422);
});
