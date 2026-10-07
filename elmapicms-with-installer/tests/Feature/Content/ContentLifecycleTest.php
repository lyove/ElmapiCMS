<?php

use App\Models\ContentEntry;
use App\Models\ContentFieldGroup;
use App\Models\ContentFieldValue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Content\ContentCreationTestSupport;

uses(RefreshDatabase::class);

test('content destroy moves entry to trash', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'move_content_to_trash');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->actingAs($user)->deleteJson(route('projects.collections.content.destroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))
        ->assertOk()
        ->assertJsonPath('message', 'Content moved to trash successfully');

    expect($entry->fresh()->deleted_at)->not->toBeNull();
});

test('content restore restores trashed entry', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['move_content_to_trash', 'update_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->actingAs($user)->deleteJson(route('projects.collections.content.destroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertOk();

    $this->actingAs($user)->putJson(route('projects.collections.content.restore', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry->id,
    ], absolute: false))
        ->assertOk()
        ->assertJsonPath('message', 'Content restored');

    expect($entry->fresh()->deleted_at)->toBeNull();
});

test('content force delete removes entry and related values and groups', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'delete_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $groupField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'options' => ['repeatable' => true],
        'order' => 1,
    ]);
    $childField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Meta Title',
        'name' => 'meta-title',
        'parent_field_id' => $groupField->id,
        'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $groupInstance = ContentFieldGroup::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $groupField->id,
        'sort_order' => 0,
    ]);
    ContentCreationTestSupport::createFieldValue($entry, $childField, [
        'group_instance_id' => $groupInstance->id,
        'text_value' => 'meta',
    ]);

    $this->actingAs($user)->deleteJson(route('projects.collections.content.forceDestroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))
        ->assertOk()
        ->assertJsonPath('message', 'Content permanently deleted successfully');

    $this->assertDatabaseMissing('content_entries', ['id' => $entry->id]);
    $this->assertDatabaseMissing('content_field_values', ['content_entry_id' => $entry->id]);
    $this->assertDatabaseMissing('content_field_groups', ['content_entry_id' => $entry->id]);
});

test('content destroy requires move_content_to_trash permission', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->actingAs($user)->deleteJson(route('projects.collections.content.destroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertForbidden();
});

test('content force delete requires delete_content permission', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->actingAs($user)->deleteJson(route('projects.collections.content.forceDestroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertForbidden();
});

test('content restore requires update_content permission', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'move_content_to_trash');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->actingAs($user)->deleteJson(route('projects.collections.content.destroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertOk();

    $this->actingAs($user)->putJson(route('projects.collections.content.restore', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry->id,
    ], absolute: false))->assertForbidden();
});

test('content duplicate requires create_content permission', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->actingAs($user)->postJson(route('projects.collections.content.duplicate', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertForbidden();
});

test('content duplicate cannot target entry from another collection', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    [$otherProject, $otherCollection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entryOutsideScope = ContentCreationTestSupport::createContentEntry($otherProject, $otherCollection, $user);

    $this->actingAs($user)->postJson(route('projects.collections.content.duplicate', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryOutsideScope,
    ], absolute: false))->assertNotFound();
});

test('content destroy cannot target entry from another collection', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'move_content_to_trash');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    [$otherProject, $otherCollection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entryOutsideScope = ContentCreationTestSupport::createContentEntry($otherProject, $otherCollection, $user);

    $this->actingAs($user)->deleteJson(route('projects.collections.content.destroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryOutsideScope,
    ], absolute: false))->assertNotFound();
});

test('duplicate creates a new draft entry with copied primitive and group values', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
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

    $originalEntry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'state' => 'published',
        'published_at' => now(),
    ]);
    ContentCreationTestSupport::createFieldValue($originalEntry, $titleField, ['text_value' => 'Original Title']);

    $group = ContentFieldGroup::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $originalEntry->id,
        'field_id' => $groupField->id,
        'sort_order' => 0,
    ]);
    ContentCreationTestSupport::createFieldValue($originalEntry, $groupChild, [
        'group_instance_id' => $group->id,
        'text_value' => 'Original Meta',
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.duplicate', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $originalEntry,
    ], absolute: false));

    $response->assertStatus(201)
        ->assertJsonPath('message', 'Content duplicated')
        ->assertJsonStructure(['entry_id']);

    $duplicateEntry = ContentEntry::query()->findOrFail($response->json('entry_id'));
    expect($duplicateEntry->id)->not->toBe($originalEntry->id);
    expect($duplicateEntry->state)->toBe('draft');

    expect(ContentFieldValue::query()->where('content_entry_id', $duplicateEntry->id)->where('field_id', $titleField->id)->value('text_value'))
        ->toBe('Original Title');
    expect(ContentFieldGroup::query()->where('content_entry_id', $duplicateEntry->id)->where('field_id', $groupField->id)->count())
        ->toBe(1);
    expect(ContentFieldValue::query()->where('content_entry_id', $duplicateEntry->id)->where('field_id', $groupChild->id)->value('text_value'))
        ->toBe('Original Meta');
});

test('content update can publish and then unpublish entry via dedicated endpoints', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'publish_content', 'unpublish_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'draft']);

    $publish = $this->actingAs($user)->putJson(route('projects.collections.content.publish', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false));

    $publish->assertOk()->assertJsonPath('message', 'Content published successfully');
    $entry->refresh();
    expect($entry->state)->toBe('published');
    expect($entry->published_at)->not->toBeNull();
    $publishedAt = $entry->published_at;

    $unpublish = $this->actingAs($user)->putJson(route('projects.collections.content.unpublish', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false));

    $unpublish->assertOk()->assertJsonPath('message', 'Content unpublished successfully');
    $entry->refresh();
    expect($entry->state)->toBe('draft');
    expect($entry->published_at)->not->toBeNull();
    expect($entry->published_at->toDateTimeString())->toBe($publishedAt->toDateTimeString());
});

test('content publish endpoint publishes entry', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'publish_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'draft']);

    $this->actingAs($user)->putJson(route('projects.collections.content.publish', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))
        ->assertOk()
        ->assertJsonPath('message', 'Content published successfully');

    $entry->refresh();
    expect($entry->state)->toBe('published');
    expect($entry->published_at)->not->toBeNull();
});

test('content unpublish endpoint unpublishes entry', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'unpublish_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'published', 'published_at' => now()]);

    $this->actingAs($user)->putJson(route('projects.collections.content.unpublish', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))
        ->assertOk()
        ->assertJsonPath('message', 'Content unpublished successfully');

    $entry->refresh();
    expect($entry->state)->toBe('draft');
    expect($entry->published_at)->not->toBeNull();
});

test('content publish requires publish_content permission', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'draft']);

    $this->actingAs($user)->putJson(route('projects.collections.content.publish', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertForbidden();
});

test('content unpublish requires unpublish_content permission', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'published', 'published_at' => now()]);

    $this->actingAs($user)->putJson(route('projects.collections.content.unpublish', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false))->assertForbidden();
});

test('content store invalid state falls back to draft', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'invalid-state',
        'locale' => 'en',
        'data' => [],
    ]);

    $response->assertOk()->assertJsonPath('message', 'Content saved successfully');
    $entry = ContentEntry::query()->findOrFail($response->json('entry_id'));
    expect($entry->state)->toBe('draft');
    expect($entry->published_at)->toBeNull();
});

test('content update invalid state keeps original state', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'update_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'published', 'published_at' => now()]);

    $response = $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'invalid-state',
        'locale' => 'en',
        'data' => [],
    ]);

    $response->assertOk();
    $entry->refresh();
    expect($entry->state)->toBe('published');
});

test('content restore and force delete cannot target entry from another collection', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'delete_content']);

    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    [$otherProject, $otherCollection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entryOutsideScope = ContentCreationTestSupport::createContentEntry($otherProject, $otherCollection, $user);

    $this->actingAs($user)->putJson(route('projects.collections.content.restore', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryOutsideScope->id,
    ], absolute: false))->assertNotFound();

    $this->actingAs($user)->deleteJson(route('projects.collections.content.forceDestroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryOutsideScope,
    ], absolute: false))->assertNotFound();
});
