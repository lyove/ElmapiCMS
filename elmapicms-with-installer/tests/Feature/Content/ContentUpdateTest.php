<?php

use App\Models\ContentEntry;
use App\Models\ContentFieldGroup;
use App\Models\ContentFieldValue;
use App\Models\ContentMediaRelation;
use App\Models\ContentRelationFieldRelation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Tests\Feature\Content\ContentCreationTestSupport;

uses(RefreshDatabase::class);

test('guests cannot update content', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [],
    ])->assertUnauthorized();
});

test('non members cannot update content even with permission', function (): void {
    $user = User::factory()->create();
    $owner = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($owner);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $owner);
    ContentCreationTestSupport::grantUpdateContentPermission($user);

    $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [],
    ])->assertForbidden();
});

test('members without update_content permission cannot update content', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    Permission::findOrCreate('update_content', 'web');

    $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [],
    ])->assertForbidden();
});

test('content update validates required and type rules', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantUpdateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'validations' => ['required' => ['status' => true, 'message' => 'Title required']],
        'order' => 1,
    ]);
    $emailField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'email',
        'label' => 'Author Email',
        'name' => 'author-email',
        'order' => 2,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'Old']);
    ContentCreationTestSupport::createFieldValue($entry, $emailField, ['text_value' => 'ok@example.com']);

    $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'title' => '',
            'author-email' => 'bad-email',
        ],
    ])->assertUnprocessable()->assertJsonValidationErrors(['data.title', 'data.author-email']);
});

test('content update unique allows same entry value but rejects other entry duplicate', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantUpdateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $uniqueField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Unique Code',
        'name' => 'unique-code',
        'validations' => ['unique' => ['status' => true, 'message' => 'Code already exists']],
        'order' => 1,
    ]);

    $entryA = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $entryB = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entryA, $uniqueField, ['text_value' => 'a-code']);
    ContentCreationTestSupport::createFieldValue($entryB, $uniqueField, ['text_value' => 'b-code']);

    $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryA,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => ['unique-code' => 'a-code'],
    ])->assertOk();

    $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryA,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => ['unique-code' => 'b-code'],
    ])->assertUnprocessable()->assertJsonValidationErrors(['data.unique-code']);
});

test('content update keeps existing password hash when submitted password is empty', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantUpdateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $passwordField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'password',
        'label' => 'Password',
        'name' => 'password',
        'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $initialHash = Hash::make('initial-secret');
    ContentCreationTestSupport::createFieldValue($entry, $passwordField, ['text_value' => $initialHash]);

    $response = $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'password' => '',
        ],
    ]);

    $response->assertOk()->assertJsonPath('message', 'Content saved successfully');

    $updatedPasswordValue = ContentFieldValue::query()
        ->where('content_entry_id', $entry->id)
        ->where('field_id', $passwordField->id)
        ->firstOrFail();

    expect($updatedPasswordValue->text_value)->toBe($initialHash);
});

test('content update rehashes password when new value is provided', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantUpdateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $passwordField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'password',
        'label' => 'Password',
        'name' => 'password',
        'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $initialHash = Hash::make('initial-secret');
    ContentCreationTestSupport::createFieldValue($entry, $passwordField, ['text_value' => $initialHash]);

    $response = $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'password' => 'new-secret',
        ],
    ]);

    $response->assertOk();

    $updatedPasswordValue = ContentFieldValue::query()
        ->where('content_entry_id', $entry->id)
        ->where('field_id', $passwordField->id)
        ->firstOrFail();

    expect($updatedPasswordValue->text_value)->not->toBe($initialHash);
    expect(Hash::check('new-secret', $updatedPasswordValue->text_value))->toBeTrue();
});

test('content update replaces repeatable group media and relation data', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantUpdateContentPermission($user);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    [$relationCollection, $oldRelationEntry, $newRelationEntry] = ContentCreationTestSupport::createRelationCollectionWithEntries($project, $user);
    $oldAsset = ContentCreationTestSupport::createAsset($project, $user, 'old.jpg');
    $newAsset = ContentCreationTestSupport::createAsset($project, $user, 'new.jpg');

    $tagsField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Tags',
        'name' => 'tags',
        'options' => ['repeatable' => true],
        'order' => 1,
    ]);
    $groupField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'options' => ['repeatable' => true],
        'order' => 2,
    ]);
    $groupChild = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Meta Title',
        'name' => 'meta-title',
        'parent_field_id' => $groupField->id,
        'order' => 1,
    ]);
    $mediaField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'media',
        'label' => 'Gallery',
        'name' => 'gallery',
        'options' => ['media' => ['type' => 2]],
        'order' => 3,
    ]);
    $relationField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'relation',
        'label' => 'Authors',
        'name' => 'authors',
        'options' => ['relation' => ['collection' => $relationCollection->id, 'type' => 2]],
        'order' => 4,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    ContentCreationTestSupport::createFieldValue($entry, $tagsField, ['text_value' => 'old-tag']);
    $oldGroupInstance = ContentFieldGroup::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $groupField->id,
        'sort_order' => 0,
    ]);
    ContentCreationTestSupport::createFieldValue($entry, $groupChild, [
        'group_instance_id' => $oldGroupInstance->id,
        'text_value' => 'Old Meta',
    ]);

    $oldMediaValue = ContentCreationTestSupport::createFieldValue($entry, $mediaField, ['json_value' => [$oldAsset->id]]);
    ContentMediaRelation::create([
        'field_value_id' => $oldMediaValue->id,
        'asset_id' => $oldAsset->id,
        'sort_order' => 0,
    ]);

    $oldRelationValue = ContentCreationTestSupport::createFieldValue($entry, $relationField, ['json_value' => [$oldRelationEntry->id]]);
    ContentRelationFieldRelation::create([
        'field_value_id' => $oldRelationValue->id,
        'related_id' => $oldRelationEntry->id,
        'related_type' => ContentEntry::class,
        'sort_order' => 0,
    ]);

    $response = $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'published',
        'locale' => 'tr',
        'data' => [
            'tags' => [['value' => 'new-tag-1'], ['value' => 'new-tag-2']],
            'seo' => [
                ['meta-title' => 'New Meta 1'],
                ['meta-title' => 'New Meta 2'],
            ],
            'gallery' => [$newAsset->id],
            'authors' => [$newRelationEntry->id],
        ],
    ]);

    $response->assertOk()->assertJsonPath('message', 'Content saved successfully');
    $entry->refresh();
    expect($entry->locale)->toBe('tr');
    expect($entry->is_draft_dirty)->toBeTrue();

    expect(ContentFieldValue::query()->where('content_entry_id', $entry->id)->where('field_id', $tagsField->id)->pluck('text_value')->all())
        ->toBe(['new-tag-1', 'new-tag-2']);
    expect(ContentFieldGroup::query()->where('content_entry_id', $entry->id)->where('field_id', $groupField->id)->count())->toBe(2);
    expect(ContentFieldValue::query()->where('content_entry_id', $entry->id)->where('field_id', $groupChild->id)->pluck('text_value')->all())
        ->toBe(['New Meta 1', 'New Meta 2']);

    $newMediaValue = ContentFieldValue::query()->where('content_entry_id', $entry->id)->where('field_id', $mediaField->id)->firstOrFail();
    expect(ContentMediaRelation::query()->where('field_value_id', $newMediaValue->id)->pluck('asset_id')->all())
        ->toBe([$newAsset->id]);

    $newRelationValue = ContentFieldValue::query()->where('content_entry_id', $entry->id)->where('field_id', $relationField->id)->firstOrFail();
    expect(ContentRelationFieldRelation::query()->where('field_value_id', $newRelationValue->id)->pluck('related_id')->all())
        ->toBe([$newRelationEntry->id]);
});

test('content edit page requires authentication and update_content permission', function (): void {
    $member = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($member);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $member);

    $this->get(route('projects.collections.content.edit', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertRedirect(route('login', absolute: false));

    $this->actingAs($member)->get(route('projects.collections.content.edit', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertForbidden();

    ContentCreationTestSupport::grantPermission($member, 'update_content');
    $this->actingAs($member)->get(route('projects.collections.content.edit', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertOk();
});
