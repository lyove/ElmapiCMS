<?php

use App\Models\CollectionTemplate;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantCreateCollectionPermission(User $user): void
{
    Permission::findOrCreate('create_collection', 'web');
    $user->givePermissionTo('create_collection');
}

function collectionPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Articles',
        'slug' => 'articles',
        'is_singleton' => false,
    ], $overrides);
}

test('guests are redirected when creating collections', function (): void {
    $project = Project::factory()->create();

    $this->post(route('projects.collections.store', ['project' => $project], absolute: false), collectionPayload())
        ->assertRedirect(route('login', absolute: false));
});

test('non members cannot create collections even with permission', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    grantCreateCollectionPermission($user);

    $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $project], absolute: false), collectionPayload())
        ->assertForbidden();
});

test('members without create_collection permission cannot create collections', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    Permission::findOrCreate('create_collection', 'web');

    $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $project], absolute: false), collectionPayload())
        ->assertForbidden();
});

test('authorized members can create collections and are redirected to collection page', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCreateCollectionPermission($user);

    $response = $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $project], absolute: false), collectionPayload());

    $collection = $project->collections()->where('slug', 'articles')->firstOrFail();

    $response->assertRedirect(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));
    $response->assertSessionHas('success', 'Collection created successfully.');

    $this->assertDatabaseHas('collections', [
        'id' => $collection->id,
        'project_id' => $project->id,
        'name' => 'Articles',
        'slug' => 'articles',
        'is_singleton' => false,
        'order' => $collection->id,
    ]);
});

test('collection creation validates required fields and reserved slugs', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCreateCollectionPermission($user);

    $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $project], absolute: false), collectionPayload([
            'name' => '',
            'slug' => 'collections',
        ]))
        ->assertInvalid(['name', 'slug']);

    $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $project], absolute: false), collectionPayload([
            'slug' => 'files',
        ]))
        ->assertInvalid(['slug']);
});

test('collection slug must be unique within same project but can repeat across projects', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);
    $projectB->members()->attach($user->id);
    grantCreateCollectionPermission($user);

    $projectA->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $projectA], absolute: false), collectionPayload([
            'name' => 'Articles Duplicate',
            'slug' => 'articles',
        ]))
        ->assertInvalid(['slug']);

    $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $projectB], absolute: false), collectionPayload([
            'name' => 'Articles In Other Project',
            'slug' => 'articles',
        ]))
        ->assertRedirect();

    $this->assertDatabaseHas('collections', [
        'project_id' => $projectB->id,
        'slug' => 'articles',
    ]);
});

test('collection can be created from template and copies template fields', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCreateCollectionPermission($user);

    $template = CollectionTemplate::create([
        'name' => 'Blog Template',
        'slug' => 'blog-template',
        'description' => 'Template description',
        'is_singleton' => false,
    ]);
    $template->fields()->create([
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'description' => null,
        'placeholder' => null,
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $template->fields()->create([
        'type' => 'longtext',
        'label' => 'Body',
        'name' => 'body',
        'description' => null,
        'placeholder' => null,
        'options' => [],
        'validations' => [],
        'order' => 2,
    ]);

    $response = $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $project], absolute: false), collectionPayload([
            'name' => 'Blog',
            'slug' => 'blog',
            'template_id' => $template->id,
            'is_singleton' => true,
        ]));

    $collection = $project->collections()->where('slug', 'blog')->firstOrFail();

    $response->assertRedirect(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));

    $this->assertDatabaseHas('collection_fields', [
        'collection_id' => $collection->id,
        'project_id' => $project->id,
        'name' => 'title',
        'type' => 'text',
        'order' => 1,
    ]);
    $this->assertDatabaseHas('collection_fields', [
        'collection_id' => $collection->id,
        'project_id' => $project->id,
        'name' => 'body',
        'type' => 'longtext',
        'order' => 2,
    ]);
    $this->assertDatabaseHas('collections', [
        'id' => $collection->id,
        'is_singleton' => true,
    ]);
});

test('authorized members can create singleton collection without template', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCreateCollectionPermission($user);

    $response = $this->actingAs($user)
        ->post(route('projects.collections.store', ['project' => $project], absolute: false), collectionPayload([
            'name' => 'Homepage',
            'slug' => 'homepage',
            'is_singleton' => true,
        ]));

    $collection = $project->collections()->where('slug', 'homepage')->firstOrFail();

    $response->assertRedirect(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));
    $this->assertDatabaseHas('collections', [
        'id' => $collection->id,
        'is_singleton' => true,
    ]);
});
