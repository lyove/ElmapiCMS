<?php

use App\Models\ContentEntryVersion;
use App\Models\ContentFieldValue;
use App\Models\User;
use App\Services\ContentEntryVersioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Content\ContentCreationTestSupport;

uses(RefreshDatabase::class);

function versioningService(): ContentEntryVersioningService
{
    return app(ContentEntryVersioningService::class);
}

test('publishing an entry creates version v1 and sets pointers', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'state' => 'draft',
        'is_draft_dirty' => true,
    ]);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'Hello World']);

    $version = versioningService()->publish($entry->fresh(), null, null, $user->id);

    expect($version->version_number)->toBe(1);
    expect($version->snapshot['fields']['title'] ?? null)->toBe('Hello World');

    $entry->refresh();
    expect($entry->state)->toBe('published');
    expect($entry->published_version_id)->toBe($version->id);
    expect($entry->published_version_number)->toBe(1);
    expect($entry->is_draft_dirty)->toBeFalse();
    expect($entry->published_at)->not->toBeNull();
});

test('editing a published entry marks the draft dirty and keeps published pointers', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'publish_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'state' => 'draft',
    ]);

    $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
    ], absolute: false), [
        'locale' => 'en',
        'data' => ['title' => 'V1'],
    ])->assertOk();

    $this->actingAs($user)->putJson(route('projects.collections.content.publish', [
        'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
    ], absolute: false))->assertOk();

    $entry->refresh();
    expect($entry->is_draft_dirty)->toBeFalse();
    expect($entry->published_version_number)->toBe(1);

    $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
    ], absolute: false), [
        'locale' => 'en',
        'data' => ['title' => 'V1 edited (draft)'],
    ])->assertOk();

    $entry->refresh();
    expect($entry->state)->toBe('published');
    expect($entry->published_version_number)->toBe(1);
    expect($entry->is_draft_dirty)->toBeTrue();

    $this->actingAs($user)->putJson(route('projects.collections.content.publish', [
        'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
    ], absolute: false))->assertOk();

    $entry->refresh();
    expect($entry->published_version_number)->toBe(2);
    expect($entry->is_draft_dirty)->toBeFalse();
});

test('discard draft restores the published snapshot without minting a new version', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'publish_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'draft']);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'Published title']);

    $this->actingAs($user)->putJson(route('projects.collections.content.publish', [
        'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
    ], absolute: false))->assertOk();

    $entry->refresh();
    expect($entry->published_version_number)->toBe(1);
    expect($entry->is_draft_dirty)->toBeFalse();

    $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
    ], absolute: false), [
        'locale' => 'en',
        'data' => ['title' => 'Dirty draft'],
    ])->assertOk();

    $entry->refresh();
    expect($entry->is_draft_dirty)->toBeTrue();
    expect(
        ContentFieldValue::query()
            ->where('content_entry_id', $entry->id)
            ->where('field_id', $titleField->id)
            ->value('text_value'),
    )->toBe('Dirty draft');

    $this->actingAs($user)->postJson(route('projects.collections.content.discardDraft', [
        'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
    ], absolute: false))->assertOk()->assertJsonPath('message', 'Draft discarded; restored to the published version.');

    $entry->refresh();
    expect($entry->is_draft_dirty)->toBeFalse();
    expect($entry->published_version_number)->toBe(1);
    expect(ContentEntryVersion::query()->where('content_entry_id', $entry->id)->count())->toBe(1);
    expect(
        ContentFieldValue::query()
            ->where('content_entry_id', $entry->id)
            ->where('field_id', $titleField->id)
            ->value('text_value'),
    )->toBe('Published title');
});

test('unpublish clears published pointers but keeps versions', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'publish_content', 'unpublish_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $v1 = versioningService()->publish($entry->fresh(), null, null, $user->id);

    $this->actingAs($user)->putJson(route('projects.collections.content.unpublish', [
        'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
    ], absolute: false))->assertOk();

    $entry->refresh();
    expect($entry->state)->toBe('draft');
    expect($entry->published_version_id)->toBeNull();
    expect($entry->published_version_number)->toBeNull();
    expect(ContentEntryVersion::query()->where('id', $v1->id)->exists())->toBeTrue();
});

test('revert restores a prior snapshot as a new version', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'A']);
    $v1 = versioningService()->publish($entry->fresh(), null, null, $user->id);

    $entry->fieldValues()->where('field_id', $titleField->id)->update(['text_value' => 'B']);
    $entry->is_draft_dirty = true;
    $entry->save();
    $v2 = versioningService()->publish($entry->fresh(), null, null, $user->id);
    expect($v2->version_number)->toBe(2);

    $v3 = versioningService()->revert($entry->fresh(), $v1->version_number, $user->id);
    expect($v3->version_number)->toBe(3);
    expect($v3->snapshot['fields']['title'] ?? null)->toBe('A');

    $entry->refresh();
    expect($entry->published_version_id)->toBe($v3->id);
    expect($entry->is_draft_dirty)->toBeFalse();

    $currentTitle = $entry->fieldValues()->where('field_id', $titleField->id)->value('text_value');
    expect($currentTitle)->toBe('A');
});

test('retention cap prunes oldest versions but keeps the current published one', function (): void {
    config()->set('content.versions_per_entry', 3);

    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'v1']);

    $v1 = versioningService()->publish($entry->fresh(), null, null, $user->id);

    for ($i = 2; $i <= 5; $i++) {
        $entry->fieldValues()->where('field_id', $titleField->id)->update(['text_value' => "v{$i}"]);
        $entry->is_draft_dirty = true;
        $entry->save();
        versioningService()->publish($entry->fresh(), null, null, $user->id);
    }

    $numbers = $entry->versions()->pluck('version_number')->sort()->values()->all();
    expect($numbers)->toBe([3, 4, 5]);

    $entry->refresh();
    expect($entry->published_version_number)->toBe(5);
    expect(ContentEntryVersion::query()->where('id', $v1->id)->exists())->toBeFalse();
});

test('unlimited retention keeps all versions when cap is -1', function (): void {
    config()->set('content.versions_per_entry', -1);

    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'v1']);

    for ($i = 1; $i <= 10; $i++) {
        $entry->fieldValues()->where('field_id', $titleField->id)->update(['text_value' => "v{$i}"]);
        $entry->is_draft_dirty = true;
        $entry->save();
        versioningService()->publish($entry->fresh(), null, null, $user->id);
    }

    expect($entry->versions()->count())->toBe(10);
});

test('api read with state=published returns snapshot data, not live draft', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $token = $project->createToken('versioning-test', ['read'])->plainTextToken;

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'Published v1']);
    versioningService()->publish($entry->fresh(), null, null, $user->id);

    $entry->fieldValues()->where('field_id', $titleField->id)->update(['text_value' => 'Unpublished draft edit']);
    $entry->is_draft_dirty = true;
    $entry->save();

    $headers = [
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ];

    $show = $this->withHeaders($headers)
        ->getJson('/api/'.$collection->slug.'/'.$entry->uuid.'?state=published');

    $show->assertOk()->assertJsonPath('fields.title', 'Published v1');

    $list = $this->withHeaders($headers)
        ->getJson('/api/'.$collection->slug.'?state=published');

    $list->assertOk();
    $listed = collect($list->json('data') ?? $list->json())
        ->firstWhere('uuid', $entry->uuid);

    expect($listed)->not->toBeNull()
        ->and(data_get($listed, 'fields.title'))->toBe('Published v1');
});

test('api read with state=published 404s when entry has never been published', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $token = $project->createToken('versioning-404-test', ['read'])->plainTextToken;

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->withHeaders([
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ])->getJson('/api/'.$collection->slug.'/'.$entry->uuid.'?state=published')
        ->assertNotFound();
});

test('public API publish and unpublish routes work correctly', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'Live']);

    $token = $project->createToken('publish-test', ['read', 'update'])->plainTextToken;

    $this->withHeaders([
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ])->postJson('/api/'.$collection->slug.'/'.$entry->uuid.'/publish')
        ->assertOk()
        ->assertJsonPath('version_number', 1);

    $entry->refresh();
    expect($entry->state)->toBe('published');
    expect($entry->published_version_number)->toBe(1);

    $this->withHeaders([
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ])->postJson('/api/'.$collection->slug.'/'.$entry->uuid.'/unpublish')->assertOk();

    $entry->refresh();
    expect($entry->state)->toBe('draft');
    expect($entry->published_version_id)->toBeNull();
    expect($entry->versions()->count())->toBe(1);
});

test('dashboard versions index returns versions with is_current_published flag', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'publish_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    versioningService()->publish($entry->fresh(), null, null, $user->id);
    versioningService()->publish($entry->fresh(), null, null, $user->id);

    $response = $this->actingAs($user)
        ->getJson(route('projects.collections.content.versions.index', [
            'project' => $project, 'collection' => $collection, 'contentEntry' => $entry,
        ], absolute: false))
        ->assertOk();

    expect($response->json('data'))->toHaveCount(2);
    expect($response->json('data.0.version_number'))->toBe(2);
    expect($response->json('data.0.is_current_published'))->toBeTrue();
    expect($response->json('data.1.is_current_published'))->toBeFalse();
});

test('dashboard version show returns snapshot for preview', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'publish_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'Published preview title']);
    $v = versioningService()->publish($entry->fresh(), 'Launch', 'First publish', $user->id);

    $this->actingAs($user)
        ->getJson(route('projects.collections.content.versions.show', [
            'project' => $project, 'collection' => $collection, 'contentEntry' => $entry, 'version' => $v->version_number,
        ], absolute: false))
        ->assertOk()
        ->assertJsonPath('version_number', 1)
        ->assertJsonPath('label', 'Launch')
        ->assertJsonPath('is_current_published', true)
        ->assertJsonPath('snapshot.fields.title', 'Published preview title');
});

test('dashboard version label and description can be updated', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'publish_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $v = versioningService()->publish($entry->fresh(), null, null, $user->id);

    $this->actingAs($user)
        ->patchJson(route('projects.collections.content.versions.update', [
            'project' => $project, 'collection' => $collection, 'contentEntry' => $entry, 'version' => $v->version_number,
        ], absolute: false), [
            'label' => 'Launch copy v1',
            'description' => 'Approved by marketing.',
        ])
        ->assertOk();

    $v->refresh();
    expect($v->label)->toBe('Launch copy v1');
    expect($v->description)->toBe('Approved by marketing.');
});

test('dashboard version revert endpoint mints a new version and republishes', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermissions($user, ['update_content', 'publish_content']);
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text', 'label' => 'Title', 'name' => 'title', 'order' => 1,
    ]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'A']);
    $v1 = versioningService()->publish($entry->fresh(), null, null, $user->id);

    $entry->fieldValues()->where('field_id', $titleField->id)->update(['text_value' => 'B']);
    $entry->is_draft_dirty = true;
    $entry->save();
    versioningService()->publish($entry->fresh(), null, null, $user->id);

    $this->actingAs($user)
        ->postJson(route('projects.collections.content.versions.revert', [
            'project' => $project, 'collection' => $collection, 'contentEntry' => $entry, 'version' => $v1->version_number,
        ], absolute: false))
        ->assertOk()
        ->assertJsonPath('new_version_number', 3);

    $entry->refresh();
    expect($entry->published_version_number)->toBe(3);
    $currentTitle = $entry->fieldValues()->where('field_id', $titleField->id)->value('text_value');
    expect($currentTitle)->toBe('A');
});
