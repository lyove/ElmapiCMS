<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantFieldManagementPermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

function makeProjectCollectionAndFieldsForManagement(User $user): array
{
    $project = Project::factory()->create();
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
        'validations' => [],
        'order' => 1,
    ]);

    $bodyField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'longtext',
        'label' => 'Body',
        'name' => 'body',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 2,
    ]);

    return [$project, $collection, $titleField, $bodyField];
}

test('guests are redirected for field management actions', function (): void {
    $user = User::factory()->create();
    [$project, $collection, $titleField, $bodyField] = makeProjectCollectionAndFieldsForManagement($user);

    $this->put(route('projects.collections.fields.update', [
        'project' => $project,
        'collection' => $collection,
        'field' => $titleField,
    ], absolute: false), [
        'type' => 'text',
        'label' => 'Updated Title',
        'name' => 'updated-title',
        'options' => ['repeatable' => false],
    ])->assertRedirect(route('login', absolute: false));

    $this->delete(route('projects.collections.fields.destroy', [
        'project' => $project,
        'collection' => $collection,
        'field' => $titleField,
    ], absolute: false))->assertRedirect(route('login', absolute: false));

    $this->post(route('projects.collections.fields.reorder', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'fields' => [
            ['id' => $titleField->id, 'order' => 20],
            ['id' => $bodyField->id, 'order' => 10],
        ],
    ])->assertRedirect(route('login', absolute: false));
});

test('members without field permissions cannot update delete or reorder fields', function (): void {
    $user = User::factory()->create();
    [$project, $collection, $titleField] = makeProjectCollectionAndFieldsForManagement($user);

    Permission::findOrCreate('update_field', 'web');
    Permission::findOrCreate('delete_field', 'web');

    $this->actingAs($user)->put(route('projects.collections.fields.update', [
        'project' => $project,
        'collection' => $collection,
        'field' => $titleField,
    ], absolute: false), [
        'type' => 'text',
        'label' => 'Updated Title',
        'name' => 'updated-title',
        'options' => ['repeatable' => false],
    ])->assertForbidden();

    $this->actingAs($user)->delete(route('projects.collections.fields.destroy', [
        'project' => $project,
        'collection' => $collection,
        'field' => $titleField,
    ], absolute: false))->assertForbidden();

    $this->actingAs($user)->post(route('projects.collections.fields.reorder', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'fields' => [['id' => $titleField->id, 'order' => 10]],
    ])->assertForbidden();
});

test('authorized members can update regular fields', function (): void {
    $user = User::factory()->create();
    grantFieldManagementPermission($user, 'update_field');
    [$project, $collection, $titleField] = makeProjectCollectionAndFieldsForManagement($user);

    $response = $this->actingAs($user)->put(route('projects.collections.fields.update', [
        'project' => $project,
        'collection' => $collection,
        'field' => $titleField,
    ], absolute: false), [
        'type' => 'text',
        'label' => 'Main Title',
        'name' => 'main-title',
        'description' => 'Displayed in the header',
        'placeholder' => 'My article title',
        'options' => ['repeatable' => false, 'hiddenInAPI' => true],
        'validations' => [
            'required' => ['status' => true, 'message' => 'Title is required'],
        ],
    ]);

    $response->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false));
    $response->assertSessionHas('success', 'Field updated successfully');

    $this->assertDatabaseHas('collection_fields', [
        'id' => $titleField->id,
        'type' => 'text',
        'label' => 'Main Title',
        'name' => 'main-title',
    ]);
});

test('group updates require repeatable option and remain top-level', function (): void {
    $user = User::factory()->create();
    grantFieldManagementPermission($user, 'update_field');
    [$project, $collection] = makeProjectCollectionAndFieldsForManagement($user);

    $group = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 3,
    ]);

    $anotherGroup = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'Meta',
        'name' => 'meta',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 4,
    ]);

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->put(route('projects.collections.fields.update', [
            'project' => $project,
            'collection' => $collection,
            'field' => $group,
        ], absolute: false), [
            'type' => 'group',
            'label' => 'SEO',
            'name' => 'seo',
            'options' => [],
        ])
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['options.repeatable']);

    $response = $this->actingAs($user)->put(route('projects.collections.fields.update', [
        'project' => $project,
        'collection' => $collection,
        'field' => $group,
    ], absolute: false), [
        'type' => 'group',
        'label' => 'SEO Updated',
        'name' => 'seo-updated',
        'parent_field_id' => $anotherGroup->id,
        'options' => ['repeatable' => true],
    ]);

    $response->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false));

    $group->refresh();
    expect($group->parent_field_id)->toBeNull();
    expect($group->options['repeatable'])->toBeTrue();
});

test('authorized members can soft delete fields', function (): void {
    $user = User::factory()->create();
    grantFieldManagementPermission($user, 'delete_field');
    [$project, $collection, $titleField] = makeProjectCollectionAndFieldsForManagement($user);

    $response = $this->actingAs($user)->delete(route('projects.collections.fields.destroy', [
        'project' => $project,
        'collection' => $collection,
        'field' => $titleField,
    ], absolute: false));

    $response->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false));
    $response->assertSessionHas('success', 'Field deleted successfully');

    $this->assertSoftDeleted('collection_fields', [
        'id' => $titleField->id,
    ]);
});

test('authorized members can reorder fields and reorder validates payload', function (): void {
    $user = User::factory()->create();
    grantFieldManagementPermission($user, 'update_field');
    [$project, $collection, $titleField, $bodyField] = makeProjectCollectionAndFieldsForManagement($user);

    $this->actingAs($user)
        ->post(route('projects.collections.fields.reorder', ['project' => $project, 'collection' => $collection], absolute: false), [
            'fields' => [
                ['id' => $titleField->id],
            ],
        ])
        ->assertInvalid(['fields.0.order']);

    $response = $this->actingAs($user)->post(route('projects.collections.fields.reorder', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'fields' => [
            ['id' => $titleField->id, 'order' => 20],
            ['id' => $bodyField->id, 'order' => 10],
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('message', 'Fields reordered successfully');

    $titleField->refresh();
    $bodyField->refresh();
    expect($titleField->order)->toBe(20);
    expect($bodyField->order)->toBe(10);
});

test('field update validates duplicate name in same parent scope', function (): void {
    $user = User::factory()->create();
    grantFieldManagementPermission($user, 'update_field');
    [$project, $collection, $titleField, $bodyField] = makeProjectCollectionAndFieldsForManagement($user);

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->put(route('projects.collections.fields.update', [
            'project' => $project,
            'collection' => $collection,
            'field' => $bodyField,
        ], absolute: false), [
            'type' => 'longtext',
            'label' => 'Body',
            'name' => 'title',
            'options' => ['repeatable' => false],
        ])
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['name']);

    $bodyField->refresh();
    expect($bodyField->name)->toBe('body');
    expect($titleField->name)->toBe('title');
});

test('field update allows same child name across different groups', function (): void {
    $user = User::factory()->create();
    grantFieldManagementPermission($user, 'update_field');
    [$project, $collection] = makeProjectCollectionAndFieldsForManagement($user);

    $groupA = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 3,
    ]);

    $groupB = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'Meta',
        'name' => 'meta',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 4,
    ]);

    $childA = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Group A Title',
        'name' => 'title',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'parent_field_id' => $groupA->id,
        'order' => 1,
    ]);

    $childB = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Group B Custom',
        'name' => 'custom',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'parent_field_id' => $groupB->id,
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->put(route('projects.collections.fields.update', [
        'project' => $project,
        'collection' => $collection,
        'field' => $childB,
    ], absolute: false), [
        'type' => 'text',
        'label' => 'Group B Title',
        'name' => 'title',
        'parent_field_id' => $groupB->id,
        'options' => ['repeatable' => false],
    ]);

    $response->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false));

    $childA->refresh();
    $childB->refresh();
    expect($childA->name)->toBe('title');
    expect($childB->name)->toBe('title');
    expect($childA->parent_field_id)->toBe($groupA->id);
    expect($childB->parent_field_id)->toBe($groupB->id);
});

test('field update parent must be a top-level group in same collection', function (): void {
    $user = User::factory()->create();
    grantFieldManagementPermission($user, 'update_field');
    [$project, $collection, $titleField] = makeProjectCollectionAndFieldsForManagement($user);

    $otherCollection = $project->collections()->create([
        'name' => 'Pages',
        'slug' => 'pages',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $nonGroup = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Not Group',
        'name' => 'not-group',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 3,
    ]);

    $externalGroup = $otherCollection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'External Group',
        'name' => 'external-group',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 1,
    ]);

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->put(route('projects.collections.fields.update', [
            'project' => $project,
            'collection' => $collection,
            'field' => $titleField,
        ], absolute: false), [
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
            'parent_field_id' => $nonGroup->id,
            'options' => ['repeatable' => false],
        ])
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['parent_field_id']);

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->put(route('projects.collections.fields.update', [
            'project' => $project,
            'collection' => $collection,
            'field' => $titleField,
        ], absolute: false), [
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
            'parent_field_id' => $externalGroup->id,
            'options' => ['repeatable' => false],
        ])
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['parent_field_id']);
});
