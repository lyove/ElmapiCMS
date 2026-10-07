<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantImportCollectionPermission(User $user): void
{
    Permission::findOrCreate('create_collection', 'web');
    $user->givePermissionTo('create_collection');
}

function collectionImportPayload(array $collectionData, array $overrides = []): array
{
    return array_merge([
        'name' => 'Imported Collection',
        'slug' => 'imported-collection',
        'is_singleton' => false,
        'import_file' => UploadedFile::fake()->createWithContent(
            'collection.json',
            json_encode($collectionData, JSON_THROW_ON_ERROR)
        ),
    ], $overrides);
}

test('guests are redirected when importing a collection', function (): void {
    $project = Project::factory()->create();

    $this->post(route('projects.collections.import', ['project' => $project], absolute: false), collectionImportPayload([
        'fields' => [],
    ]))->assertRedirect(route('login', absolute: false));
});

test('non members cannot import collections even with permission', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    grantImportCollectionPermission($user);

    $this->actingAs($user)
        ->post(route('projects.collections.import', ['project' => $project], absolute: false), collectionImportPayload([
            'fields' => [],
        ]))
        ->assertForbidden();
});

test('members without create_collection permission cannot import collections', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    Permission::findOrCreate('create_collection', 'web');

    $this->actingAs($user)
        ->post(route('projects.collections.import', ['project' => $project], absolute: false), collectionImportPayload([
            'fields' => [],
        ]))
        ->assertForbidden();
});

test('collection import rejects invalid json file', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantImportCollectionPermission($user);

    $response = $this->from('/')->actingAs($user)
        ->post(route('projects.collections.import', ['project' => $project], absolute: false), [
            'name' => 'Invalid Import',
            'slug' => 'invalid-import',
            'import_file' => UploadedFile::fake()->createWithContent('invalid.json', '{bad-json'),
        ]);

    $response->assertRedirect('/');
    $response->assertSessionHasErrors('import_file');
});

test('collection import requires fields in file structure', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantImportCollectionPermission($user);

    $response = $this->from('/')->actingAs($user)
        ->post(route('projects.collections.import', ['project' => $project], absolute: false), collectionImportPayload([
            'name' => 'No Fields Collection',
            'slug' => 'no-fields',
        ]));

    $response->assertRedirect('/');
    $response->assertSessionHasErrors('import_file');
});

test('authorized members can import collection with relation mapping group children and demo data', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $project->members()->attach($user->id);
    grantImportCollectionPermission($user);

    $authors = $project->collections()->create([
        'name' => 'Authors',
        'slug' => 'authors',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $fileData = [
        'fields' => [
            [
                'type' => 'text',
                'label' => 'Title',
                'name' => 'title',
                'options' => [],
                'validations' => [],
            ],
            [
                'type' => 'relation',
                'label' => 'Author',
                'name' => 'author',
                'options' => ['relation' => ['collection' => 'authors', 'type' => 1]],
                'validations' => [],
            ],
            [
                'type' => 'group',
                'label' => 'SEO',
                'name' => 'seo',
                'options' => [],
                'validations' => [],
                'children' => [
                    [
                        'type' => 'text',
                        'label' => 'SEO Title',
                        'name' => 'seo_title',
                        'options' => [],
                        'validations' => [],
                    ],
                ],
            ],
        ],
        'demo_data' => [
            [
                'collection' => 'anything',
                'entries' => [
                    [
                        'id' => 'e1',
                        'locale' => 'en',
                        'state' => 'published',
                        'fields' => [
                            'title' => 'Hello World',
                            'author' => [],
                            'seo' => [
                                'seo_title' => 'SEO Value',
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ];

    $response = $this->actingAs($user)
        ->post(route('projects.collections.import', ['project' => $project], absolute: false), collectionImportPayload(
            $fileData,
            ['name' => 'Posts', 'slug' => 'posts']
        ));

    $collection = $project->collections()->where('slug', 'posts')->firstOrFail();

    $response->assertRedirect(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));
    $response->assertSessionHas('success', 'Collection imported successfully.');

    $this->assertDatabaseHas('collections', [
        'id' => $collection->id,
        'name' => 'Posts',
        'slug' => 'posts',
        'project_id' => $project->id,
        'order' => $collection->id,
    ]);

    $relationField = $collection->allFields()->where('name', 'author')->firstOrFail();
    expect($relationField->options['relation']['collection'])->toBe($authors->id);

    $groupField = $collection->allFields()->where('name', 'seo')->firstOrFail();
    $groupChild = $collection->allFields()->where('name', 'seo_title')->firstOrFail();
    expect($groupChild->parent_field_id)->toBe($groupField->id);

    $entry = $collection->contentEntries()->firstOrFail();
    expect($entry->state)->toBe('published');
    expect($entry->locale)->toBe('en');
});

test('collection import keeps unresolved relation collection slug when target does not exist', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantImportCollectionPermission($user);

    $fileData = [
        'fields' => [
            [
                'type' => 'relation',
                'label' => 'Unknown Relation',
                'name' => 'unknown_relation',
                'options' => ['relation' => ['collection' => 'missing-collection', 'type' => 1]],
                'validations' => [],
            ],
        ],
    ];

    $this->actingAs($user)
        ->post(route('projects.collections.import', ['project' => $project], absolute: false), collectionImportPayload(
            $fileData,
            ['name' => 'Orphans', 'slug' => 'orphans']
        ))
        ->assertRedirect();

    $collection = $project->collections()->where('slug', 'orphans')->firstOrFail();
    $relationField = $collection->allFields()->where('name', 'unknown_relation')->firstOrFail();

    expect($relationField->options['relation']['collection'])->toBe('missing-collection');
});
