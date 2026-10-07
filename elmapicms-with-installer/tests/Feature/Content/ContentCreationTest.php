<?php

use App\Models\ContentEntry;
use App\Models\ContentFieldGroup;
use App\Models\ContentFieldValue;
use App\Models\ContentMediaRelation;
use App\Models\ContentRelationFieldRelation;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Tests\Feature\Content\ContentCreationTestSupport;

uses(RefreshDatabase::class);

test('guests are redirected when creating content', function (): void {
    $project = Project::factory()->create();
    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'data' => [],
    ])->assertUnauthorized();
});

test('non members cannot create content even with create_content permission', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    ContentCreationTestSupport::grantCreateContentPermission($user);

    $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [],
    ])->assertForbidden();
});

test('members without create_content permission cannot create content', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    Permission::findOrCreate('create_content', 'web');

    $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [],
    ])->assertForbidden();
});

test('content creation stores primitive field types and optioned values', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    ContentCreationTestSupport::createField($project, $collection, ['type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'longtext', 'label' => 'Summary', 'name' => 'summary', 'order' => 2]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'richtext', 'label' => 'Body', 'name' => 'body', 'options' => ['editor' => ['type' => 1, 'outputFormat' => 'html']], 'order' => 3]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'email', 'label' => 'Author Email', 'name' => 'author-email', 'order' => 4]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'password', 'label' => 'Password', 'name' => 'password', 'order' => 5]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'number', 'label' => 'Score', 'name' => 'score', 'order' => 6]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'boolean', 'label' => 'Featured', 'name' => 'featured', 'order' => 7]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'color', 'label' => 'Theme Color', 'name' => 'theme-color', 'order' => 8]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'date', 'label' => 'Publish Window', 'name' => 'publish-window', 'options' => ['includeTime' => true, 'mode' => 'range'], 'order' => 9]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'time', 'label' => 'Publish Time', 'name' => 'publish-time', 'order' => 10]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'json', 'label' => 'Metadata', 'name' => 'metadata', 'order' => 11]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'enumeration', 'label' => 'Categories', 'name' => 'categories', 'options' => ['enumeration' => ['list' => ['news', 'guides']], 'multiple' => true], 'order' => 12]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'published',
        'locale' => 'tr',
        'data' => [
            'title' => 'Deep Dive',
            'summary' => 'This is a long summary',
            'body' => ['html' => '<p>Hello</p>', 'json' => ['root' => ['children' => []]]],
            'author-email' => 'editor@example.com',
            'password' => 'top-secret',
            'score' => 88,
            'featured' => true,
            'theme-color' => '#aabbcc',
            'publish-window' => '2026-01-01 10:00:00 - 2026-01-02 11:00:00',
            'publish-time' => '14:30',
            'metadata' => ['layout' => 'wide'],
            'categories' => ['news', 'guides'],
        ],
    ]);

    $response->assertOk()->assertJsonPath('message', 'Content published successfully');

    $entry = ContentEntry::query()->findOrFail($response->json('entry_id'));
    expect($entry->locale)->toBe('tr');
    expect($entry->state)->toBe('published');
    expect($entry->published_at)->not->toBeNull();

    $passwordValue = ContentFieldValue::query()->where('content_entry_id', $entry->id)->where('field_type', 'password')->firstOrFail();
    expect(Hash::check('top-secret', $passwordValue->text_value))->toBeTrue();

    $dateValue = ContentFieldValue::query()->where('content_entry_id', $entry->id)->where('field_type', 'date')->firstOrFail();
    expect((string) $dateValue->datetime_value)->toContain('2026-01-01 10:00:00');
    expect((string) $dateValue->datetime_value_end)->toContain('2026-01-02 11:00:00');
});

test('content creation stores relation and media references', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    [$relationCollection, $entryA, $entryB] = ContentCreationTestSupport::createRelationCollectionWithEntries($project, $user);
    $assetA = ContentCreationTestSupport::createAsset($project, $user, 'hero-a.jpg');
    $assetB = ContentCreationTestSupport::createAsset($project, $user, 'hero-b.jpg');

    $relationField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'relation',
        'label' => 'Authors',
        'name' => 'authors',
        'options' => ['relation' => ['collection' => $relationCollection->id, 'type' => 2], 'includeDraft' => true],
        'order' => 1,
    ]);
    $mediaField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'media',
        'label' => 'Gallery',
        'name' => 'gallery',
        'options' => ['media' => ['type' => 2]],
        'order' => 2,
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'authors' => [$entryA->id, $entryB->id],
            'gallery' => [$assetA->id, $assetB->id],
        ],
    ]);

    $response->assertOk();
    $contentEntryId = $response->json('entry_id');

    $relationValue = ContentFieldValue::query()->where('content_entry_id', $contentEntryId)->where('field_id', $relationField->id)->firstOrFail();
    $mediaValue = ContentFieldValue::query()->where('content_entry_id', $contentEntryId)->where('field_id', $mediaField->id)->firstOrFail();

    expect(ContentRelationFieldRelation::query()->where('field_value_id', $relationValue->id)->count())->toBe(2);
    expect(ContentMediaRelation::query()->where('field_value_id', $mediaValue->id)->count())->toBe(2);
});

test('content creation stores repeatable text values as multiple rows', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $repeatableField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Tags',
        'name' => 'tags',
        'options' => ['repeatable' => true],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'tags' => [['value' => 'cms'], ['value' => 'api'], ['value' => 'laravel']],
        ],
    ]);

    $response->assertOk();
    $entryId = $response->json('entry_id');

    expect(
        ContentFieldValue::query()
            ->where('content_entry_id', $entryId)
            ->where('field_id', $repeatableField->id)
            ->count()
    )->toBe(3);
});

test('content creation stores repeatable group instances and child values', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $group = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'options' => ['repeatable' => true],
        'order' => 1,
    ]);

    $childTitle = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Meta Title',
        'name' => 'meta-title',
        'parent_field_id' => $group->id,
        'order' => 1,
    ]);

    $childEmail = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'email',
        'label' => 'SEO Email',
        'name' => 'seo-email',
        'parent_field_id' => $group->id,
        'order' => 2,
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'seo' => [
                ['meta-title' => 'One', 'seo-email' => 'one@example.com'],
                ['meta-title' => 'Two', 'seo-email' => 'two@example.com'],
            ],
        ],
    ]);

    $response->assertOk();
    $entryId = $response->json('entry_id');

    expect(ContentFieldGroup::query()->where('content_entry_id', $entryId)->where('field_id', $group->id)->count())->toBe(2);
    expect(ContentFieldValue::query()->where('content_entry_id', $entryId)->where('field_id', $childTitle->id)->count())->toBe(2);
    expect(ContentFieldValue::query()->where('content_entry_id', $entryId)->where('field_id', $childEmail->id)->count())->toBe(2);
});

test('content creation accepts single object for non repeatable group', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $group = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'options' => ['repeatable' => false],
        'order' => 1,
    ]);

    $childTitle = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Meta Title',
        'name' => 'meta-title',
        'parent_field_id' => $group->id,
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'seo' => ['meta-title' => 'Single object'],
        ],
    ]);

    $response->assertOk();
    $entryId = $response->json('entry_id');

    expect(ContentFieldGroup::query()->where('content_entry_id', $entryId)->where('field_id', $group->id)->count())->toBe(1);
    expect(ContentFieldValue::query()->where('content_entry_id', $entryId)->where('field_id', $childTitle->id)->count())->toBe(1);
    expect(ContentEntry::query()->findOrFail($entryId)->locale)->toBe('en');
});

test('content creation validates mixed invalid fields in one payload', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $group = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'options' => ['repeatable' => false],
        'order' => 1,
    ]);

    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'validations' => ['required' => ['status' => true, 'message' => 'Title required']],
        'order' => 2,
    ]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'email', 'label' => 'Author Email', 'name' => 'author-email', 'order' => 3]);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'number',
        'label' => 'Score',
        'name' => 'score',
        'validations' => ['charcount' => ['status' => true, 'type' => 'Between', 'min' => 1, 'max' => 100, 'message' => 'Out of range']],
        'order' => 4,
    ]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'color', 'label' => 'Theme Color', 'name' => 'theme-color', 'order' => 5]);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Tags',
        'name' => 'tags',
        'options' => ['repeatable' => true],
        'validations' => ['required' => ['status' => true, 'message' => 'Tags required'], 'charcount' => ['status' => true, 'type' => 'Min', 'min' => 3, 'max' => null, 'message' => 'Tag too short']],
        'order' => 6,
    ]);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Meta Title',
        'name' => 'meta-title',
        'parent_field_id' => $group->id,
        'validations' => ['required' => ['status' => true, 'message' => 'Meta title required']],
        'order' => 1,
    ]);
    ContentCreationTestSupport::createField($project, $collection, ['type' => 'email', 'label' => 'SEO Email', 'name' => 'seo-email', 'parent_field_id' => $group->id, 'order' => 2]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'title' => '',
            'author-email' => 'invalid-email',
            'score' => 1000,
            'theme-color' => '#zzzzzz',
            'tags' => [['value' => 'ab']],
            'seo' => [['meta-title' => '', 'seo-email' => 'invalid-email']],
        ],
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors([
        'data.title',
        'data.author-email',
        'data.score',
        'data.theme-color',
        'data.tags.0.value',
        'data.seo.0.meta-title',
        'data.seo.0.seo-email',
    ]);
});

test('content creation rejects invalid locale for project', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'de',
        'data' => [],
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors(['locale']);
});

test('content creation uses project default locale when locale is omitted', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'data' => [],
    ]);

    $response->assertOk();
    $entry = ContentEntry::query()->findOrFail($response->json('entry_id'));
    expect($entry->locale)->toBe('en');
});

test('content creation rejects duplicate values for unique scalar fields', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Unique Code',
        'name' => 'unique-code',
        'validations' => [
            'required' => ['status' => true, 'message' => 'Code required'],
            'unique' => ['status' => true, 'message' => 'Code already exists'],
        ],
        'order' => 1,
    ]);

    $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => ['unique-code' => 'abc-001'],
    ])->assertOk();

    $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => ['unique-code' => 'abc-001'],
    ])->assertUnprocessable()->assertJsonValidationErrors(['data.unique-code']);
});

test('content creation rejects duplicates for unique repeatable fields', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Unique Tags',
        'name' => 'unique-tags',
        'options' => ['repeatable' => true],
        'validations' => [
            'required' => ['status' => true, 'message' => 'Tags required'],
            'unique' => ['status' => true, 'message' => 'Tag already used'],
        ],
        'order' => 1,
    ]);

    $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => ['unique-tags' => [['value' => 't1'], ['value' => 't2']]],
    ])->assertOk();

    $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => ['unique-tags' => [['value' => 't2']]],
    ])->assertUnprocessable()->assertJsonValidationErrors(['data.unique-tags.*.value']);
});

test('content creation allows same unique value across different collections', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantCreateContentPermission($user);
    [$project, $collectionA] = ContentCreationTestSupport::createProjectAndCollection($user);

    $collectionB = $project->collections()->create([
        'name' => 'Pages',
        'slug' => 'pages',
        'order' => 2,
        'is_singleton' => false,
    ]);

    ContentCreationTestSupport::createField($project, $collectionA, [
        'type' => 'text',
        'label' => 'Unique Code',
        'name' => 'unique-code',
        'validations' => ['unique' => ['status' => true, 'message' => 'Code already exists']],
        'order' => 1,
    ]);
    ContentCreationTestSupport::createField($project, $collectionB, [
        'type' => 'text',
        'label' => 'Unique Code',
        'name' => 'unique-code',
        'validations' => ['unique' => ['status' => true, 'message' => 'Code already exists']],
        'order' => 1,
    ]);

    $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collectionA,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => ['unique-code' => 'same-value'],
    ])->assertOk();

    $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collectionB,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => ['unique-code' => 'same-value'],
    ])->assertOk();
});

test('content create page requires authentication and create_content permission', function (): void {
    $member = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($member);
    $outsider = User::factory()->create();

    $this->get(route('projects.collections.content.create', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false))->assertRedirect(route('login', absolute: false));

    $this->actingAs($member)->get(route('projects.collections.content.create', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false))->assertForbidden();

    ContentCreationTestSupport::grantPermission($member, 'create_content');
    $this->actingAs($member)->get(route('projects.collections.content.create', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false))->assertOk();

    ContentCreationTestSupport::grantPermission($outsider, 'create_content');
    $this->actingAs($outsider)->get(route('projects.collections.content.create', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false))->assertForbidden();
});
