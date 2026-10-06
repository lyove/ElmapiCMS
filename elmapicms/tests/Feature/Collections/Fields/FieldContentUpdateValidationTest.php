<?php

use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantContentUpdatePermission(User $user): void
{
    Permission::findOrCreate('update_content', 'web');
    $user->givePermissionTo('update_content');
}

function makeProjectCollectionForContentUpdate(User $user): array
{
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en', 'tr'],
    ]);
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $titleField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [
            'required' => ['status' => true, 'message' => 'Title required'],
            'unique' => ['status' => true, 'message' => 'Title already exists'],
        ],
        'order' => 1,
    ]);

    $emailField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'email',
        'label' => 'Author Email',
        'name' => 'author-email',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 2,
    ]);

    return [$project, $collection, $titleField, $emailField];
}

function createEntryWithTitle(Project $project, $collection, int $userId, int $titleFieldId, string $title): ContentEntry
{
    $entry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $userId,
        'updated_by' => $userId,
    ]);

    ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $titleFieldId,
        'field_type' => 'text',
        'text_value' => $title,
    ]);

    return $entry;
}

test('content update allows keeping same unique value on the same entry', function (): void {
    $user = User::factory()->create();
    grantContentUpdatePermission($user);
    [$project, $collection, $titleField] = makeProjectCollectionForContentUpdate($user);

    $entry = createEntryWithTitle($project, $collection, $user->id, $titleField->id, 'original-title');

    $response = $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'title' => 'original-title',
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('message', 'Content saved successfully');
});

test('content update rejects duplicate unique value from another entry', function (): void {
    $user = User::factory()->create();
    grantContentUpdatePermission($user);
    [$project, $collection, $titleField] = makeProjectCollectionForContentUpdate($user);

    $target = createEntryWithTitle($project, $collection, $user->id, $titleField->id, 'target-title');
    createEntryWithTitle($project, $collection, $user->id, $titleField->id, 'existing-title');

    $response = $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $target,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'title' => 'existing-title',
        ],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['data.title']);
});

test('content update validates required and type rules for submitted payload', function (): void {
    $user = User::factory()->create();
    grantContentUpdatePermission($user);
    [$project, $collection, $titleField, $emailField] = makeProjectCollectionForContentUpdate($user);

    $entry = createEntryWithTitle($project, $collection, $user->id, $titleField->id, 'original-title');

    ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $emailField->id,
        'field_type' => 'email',
        'text_value' => 'author@example.com',
    ]);

    $response = $this->actingAs($user)->putJson(route('projects.collections.content.update', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'title' => '',
            'author-email' => 'not-an-email',
        ],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['data.title', 'data.author-email']);
});
