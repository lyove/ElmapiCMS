<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantFieldEdgePermissions(User $user): void
{
    foreach (['create_field', 'update_field', 'delete_field'] as $permission) {
        Permission::findOrCreate($permission, 'web');
        $user->givePermissionTo($permission);
    }
}

function makeProjectWithTwoCollections(User $user): array
{
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $articles = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $pages = $project->collections()->create([
        'name' => 'Pages',
        'slug' => 'pages',
        'order' => 2,
        'is_singleton' => false,
    ]);

    return [$project, $articles, $pages];
}

test('field update cannot target a field that belongs to another collection', function (): void {
    $user = User::factory()->create();
    grantFieldEdgePermissions($user);
    [$project, $articles, $pages] = makeProjectWithTwoCollections($user);

    $foreignField = $pages->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Page Title',
        'name' => 'page-title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->put(route('projects.collections.fields.update', [
        'project' => $project,
        'collection' => $articles,
        'field' => $foreignField,
    ], absolute: false), [
        'type' => 'text',
        'label' => 'Should Not Update',
        'name' => 'should-not-update',
        'options' => ['repeatable' => false],
    ]);

    $response->assertNotFound();

    $foreignField->refresh();
    expect($foreignField->label)->toBe('Page Title');
    expect($foreignField->name)->toBe('page-title');
});

test('field delete cannot target a field that belongs to another collection', function (): void {
    $user = User::factory()->create();
    grantFieldEdgePermissions($user);
    [$project, $articles, $pages] = makeProjectWithTwoCollections($user);

    $foreignField = $pages->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Page Title',
        'name' => 'page-title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->delete(route('projects.collections.fields.destroy', [
        'project' => $project,
        'collection' => $articles,
        'field' => $foreignField,
    ], absolute: false));

    $response->assertNotFound();
    $this->assertDatabaseHas('collection_fields', [
        'id' => $foreignField->id,
        'deleted_at' => null,
    ]);
});

test('field reorder cannot change order of fields outside current collection', function (): void {
    $user = User::factory()->create();
    grantFieldEdgePermissions($user);
    [$project, $articles, $pages] = makeProjectWithTwoCollections($user);

    $articleField = $articles->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Article Title',
        'name' => 'article-title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $foreignField = $pages->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Page Title',
        'name' => 'page-title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.fields.reorder', [
        'project' => $project,
        'collection' => $articles,
    ], absolute: false), [
        'fields' => [
            ['id' => $articleField->id, 'order' => 50],
            ['id' => $foreignField->id, 'order' => 99],
        ],
    ]);

    $response->assertUnprocessable();

    $articleField->refresh();
    $foreignField->refresh();
    expect($articleField->order)->toBe(1);
    expect($foreignField->order)->toBe(1);
});

test('child field cannot be attached to a soft deleted group', function (): void {
    $user = User::factory()->create();
    grantFieldEdgePermissions($user);
    [$project, $articles] = makeProjectWithTwoCollections($user);

    $group = $articles->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 1,
    ]);

    $this->actingAs($user)->delete(route('projects.collections.fields.destroy', [
        'project' => $project,
        'collection' => $articles,
        'field' => $group,
    ], absolute: false))->assertRedirect();

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $articles], absolute: false))
        ->post(route('projects.collections.fields.store', [
            'project' => $project,
            'collection' => $articles,
        ], absolute: false), [
            'type' => 'text',
            'label' => 'Meta Title',
            'name' => 'meta-title',
            'options' => ['repeatable' => false],
            'validations' => [],
            'parent_field_id' => $group->id,
        ])
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $articles], absolute: false))
        ->assertInvalid(['parent_field_id']);
});

test('field name can be reused after previous field with same name is soft deleted', function (): void {
    $user = User::factory()->create();
    grantFieldEdgePermissions($user);
    [$project, $articles] = makeProjectWithTwoCollections($user);

    $field = $articles->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 1,
    ]);

    $this->actingAs($user)->delete(route('projects.collections.fields.destroy', [
        'project' => $project,
        'collection' => $articles,
        'field' => $field,
    ], absolute: false))->assertRedirect();

    $response = $this->actingAs($user)->post(route('projects.collections.fields.store', [
        'project' => $project,
        'collection' => $articles,
    ], absolute: false), [
        'type' => 'text',
        'label' => 'New Title',
        'name' => 'title',
        'options' => ['repeatable' => false],
        'validations' => [],
    ]);

    $response->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $articles], absolute: false));

    $this->assertDatabaseHas('collection_fields', [
        'collection_id' => $articles->id,
        'name' => 'title',
        'deleted_at' => null,
    ]);
});
