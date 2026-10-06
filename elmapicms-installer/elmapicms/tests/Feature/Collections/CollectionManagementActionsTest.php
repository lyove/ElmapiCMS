<?php

use App\Models\CollectionTemplate;
use App\Models\ContentEntry;
use App\Models\Field;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantCollectionPermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('guests are redirected for collection management actions', function (): void {
    $project = Project::factory()->create();
    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->put(route('projects.collections.update', ['project' => $project, 'collection' => $collection], absolute: false), [
        'name' => 'Updated',
        'slug' => 'updated',
    ])->assertRedirect(route('login', absolute: false));

    $this->delete(route('projects.collections.destroy', ['project' => $project, 'collection' => $collection], absolute: false), [
        'slug' => 'articles',
    ])->assertRedirect(route('login', absolute: false));

    $this->post(route('projects.collections.reorder', ['project' => $project], absolute: false), [
        'collections' => [
            ['id' => $collection->id, 'order' => 10],
        ],
    ])->assertRedirect(route('login', absolute: false));

    $this->post(route('collections.saveAsTemplate', ['project' => $project, 'collection' => $collection], absolute: false), [
        'name' => 'Articles Template',
    ])->assertRedirect(route('login', absolute: false));
});

test('non members cannot update delete reorder or save collection as template', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    grantCollectionPermission($user, 'update_collection');
    grantCollectionPermission($user, 'delete_collection');
    grantCollectionPermission($user, 'access_collection_settings');

    $this->actingAs($user)
        ->put(route('projects.collections.update', ['project' => $project, 'collection' => $collection], absolute: false), [
            'name' => 'Updated',
            'slug' => 'updated',
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->delete(route('projects.collections.destroy', ['project' => $project, 'collection' => $collection], absolute: false), [
            'slug' => 'articles',
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('projects.collections.reorder', ['project' => $project], absolute: false), [
            'collections' => [
                ['id' => $collection->id, 'order' => 2],
            ],
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('collections.saveAsTemplate', ['project' => $project, 'collection' => $collection], absolute: false), [
            'name' => 'Articles Template',
        ])
        ->assertForbidden();
});

test('authorized members can update collection and update requires valid slug', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCollectionPermission($user, 'update_collection');

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $project->collections()->create([
        'name' => 'Pages',
        'slug' => 'pages',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->put(route('projects.collections.update', ['project' => $project, 'collection' => $collection], absolute: false), [
            'name' => 'Articles Updated',
            'slug' => 'articles-updated',
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Collection updated successfully.');

    $this->assertDatabaseHas('collections', [
        'id' => $collection->id,
        'name' => 'Articles Updated',
        'slug' => 'articles-updated',
    ]);

    $this->actingAs($user)
        ->put(route('projects.collections.update', ['project' => $project, 'collection' => $collection], absolute: false), [
            'name' => 'Invalid Slug',
            'slug' => 'collections',
        ])
        ->assertInvalid(['slug']);

    $this->actingAs($user)
        ->put(route('projects.collections.update', ['project' => $project, 'collection' => $collection], absolute: false), [
            'name' => 'Duplicate Slug',
            'slug' => 'pages',
        ])
        ->assertInvalid(['slug']);
});

test('renaming collection slug rewrites relation fields that stored the old slug string', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCollectionPermission($user, 'update_collection');

    $authors = $project->collections()->create([
        'name' => 'Authors',
        'slug' => 'authors',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $posts = $project->collections()->create([
        'name' => 'Posts',
        'slug' => 'posts',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $relationField = Field::create([
        'project_id' => $project->id,
        'collection_id' => $posts->id,
        'type' => 'relation',
        'label' => 'Author',
        'name' => 'author',
        'order' => 1,
        'options' => ['relation' => ['type' => 1, 'collection' => 'authors']],
        'validations' => [],
    ]);

    $this->actingAs($user)
        ->put(route('projects.collections.update', ['project' => $project, 'collection' => $authors], absolute: false), [
            'name' => 'Authors',
            'slug' => 'authors11',
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Collection updated successfully.');

    $relationField->refresh();

    expect($relationField->options['relation']['collection'])->toBe($authors->id);
    expect($relationField->options['relation'])->not->toHaveKey('collection_id');
});

test('renaming collection slug rewrites relation fields that stored old slug in legacy collection_id', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCollectionPermission($user, 'update_collection');

    $tags = $project->collections()->create([
        'name' => 'Tags',
        'slug' => 'tags-legacy-slug-remap',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $posts = $project->collections()->create([
        'name' => 'Posts',
        'slug' => 'posts-legacy-slug-remap',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $relationField = Field::create([
        'project_id' => $project->id,
        'collection_id' => $posts->id,
        'type' => 'relation',
        'label' => 'Tag',
        'name' => 'tag',
        'order' => 1,
        'options' => ['relation' => ['type' => 1, 'collection_id' => 'tags-legacy-slug-remap']],
        'validations' => [],
    ]);

    $this->actingAs($user)
        ->put(route('projects.collections.update', ['project' => $project, 'collection' => $tags], absolute: false), [
            'name' => 'Tags',
            'slug' => 'tags-renamed',
        ])
        ->assertRedirect();

    $relationField->refresh();

    expect($relationField->options['relation']['collection'])->toBe($tags->id);
    expect($relationField->options['relation'])->not->toHaveKey('collection_id');
});

test('authorized members can delete collection and cleanup fields and entries', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCollectionPermission($user, 'delete_collection');

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $field = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $entry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->delete(route('projects.collections.destroy', ['project' => $project, 'collection' => $collection], absolute: false), [
            'slug' => 'wrong-slug',
        ])
        ->assertInvalid(['slug']);

    $response = $this->actingAs($user)
        ->delete(route('projects.collections.destroy', ['project' => $project, 'collection' => $collection], absolute: false), [
            'slug' => 'articles',
        ]);

    $response->assertRedirect(route('projects.show', ['project' => $project], absolute: false))
        ->assertSessionHas('success', 'Collection deleted successfully.');

    $this->assertDatabaseMissing('collections', ['id' => $collection->id]);
    $this->assertDatabaseMissing('collection_fields', ['id' => $field->id]);
    $this->assertDatabaseMissing('content_entries', ['id' => $entry->id]);
});

test('members can reorder collections within project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $first = $project->collections()->create([
        'name' => 'First',
        'slug' => 'first',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $second = $project->collections()->create([
        'name' => 'Second',
        'slug' => 'second',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $response = $this->actingAs($user)
        ->post(route('projects.collections.reorder', ['project' => $project], absolute: false), [
            'collections' => [
                ['id' => $first->id, 'order' => 20],
                ['id' => $second->id, 'order' => 10],
            ],
        ]);

    $response->assertOk()
        ->assertJsonPath('message', 'Collections reordered successfully');

    $first->refresh();
    $second->refresh();
    expect($first->order)->toBe(20);
    expect($second->order)->toBe(10);
});

test('reorder collections validates payload shape and ids', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->post(route('projects.collections.reorder', ['project' => $project], absolute: false), [
            'collections' => [
                ['id' => $collection->id],
            ],
        ])
        ->assertInvalid(['collections.0.order']);

    $this->actingAs($user)
        ->post(route('projects.collections.reorder', ['project' => $project], absolute: false), [
            'collections' => [
                ['id' => $collection->id, 'order' => 'not-int'],
            ],
        ])
        ->assertInvalid(['collections.0.order']);

    $this->actingAs($user)
        ->post(route('projects.collections.reorder', ['project' => $project], absolute: false), [
            'collections' => [
                ['id' => 999999, 'order' => 1],
            ],
        ])
        ->assertInvalid(['collections.0.id']);
});

test('reorder collections only updates ids that belong to the current project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $project->members()->attach($user->id);

    $inProjectCollection = $project->collections()->create([
        'name' => 'In Project',
        'slug' => 'in-project',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $foreignCollection = $otherProject->collections()->create([
        'name' => 'Foreign',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $response = $this->actingAs($user)
        ->post(route('projects.collections.reorder', ['project' => $project], absolute: false), [
            'collections' => [
                ['id' => $inProjectCollection->id, 'order' => 50],
                ['id' => $foreignCollection->id, 'order' => 99],
            ],
        ]);

    $response->assertOk();

    $inProjectCollection->refresh();
    $foreignCollection->refresh();
    expect($inProjectCollection->order)->toBe(50);
    expect($foreignCollection->order)->toBe(1);
});

test('members with collection settings access can save collection as template', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantCollectionPermission($user, 'access_collection_settings');

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => true,
    ]);
    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)
        ->from('/')
        ->post(route('collections.saveAsTemplate', ['project' => $project, 'collection' => $collection], absolute: false), [
            'name' => 'Articles Template',
        ]);

    $response->assertRedirect('/')
        ->assertSessionHas('success', 'Template created successfully.');

    $template = CollectionTemplate::query()->where('name', 'Articles Template')->firstOrFail();
    expect($template->is_singleton)->toBeTrue();
    expect($template->slug)->toBe('articles-template');

    $this->assertDatabaseHas('collection_template_fields', [
        'collection_template_id' => $template->id,
        'name' => 'title',
        'type' => 'text',
    ]);
});
