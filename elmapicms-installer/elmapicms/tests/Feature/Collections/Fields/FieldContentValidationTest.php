<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantContentCreationPermission(User $user): void
{
    Permission::findOrCreate('create_content', 'web');
    $user->givePermissionTo('create_content');
}

function makeProjectCollectionWithValidationFields(User $user): array
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

    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [
            'required' => ['status' => true, 'message' => 'Title is required'],
        ],
        'order' => 1,
    ]);

    $collection->allFields()->create([
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

    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'number',
        'label' => 'Rating',
        'name' => 'rating',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [
            'charcount' => ['status' => true, 'type' => 'Min', 'min' => 10, 'max' => null, 'message' => 'Rating too low'],
        ],
        'order' => 3,
    ]);

    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'color',
        'label' => 'Theme',
        'name' => 'theme',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 4,
    ]);

    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Tags',
        'name' => 'tags',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => true],
        'validations' => [
            'required' => ['status' => true, 'message' => 'At least one tag is required'],
            'charcount' => ['status' => true, 'type' => 'Min', 'min' => 3, 'max' => null, 'message' => 'Tag too short'],
        ],
        'order' => 5,
    ]);

    $group = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 6,
    ]);

    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Meta Title',
        'name' => 'meta-title',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [
            'required' => ['status' => true, 'message' => 'Meta title required'],
        ],
        'parent_field_id' => $group->id,
        'order' => 1,
    ]);

    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'email',
        'label' => 'SEO Contact Email',
        'name' => 'seo-contact-email',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'parent_field_id' => $group->id,
        'order' => 2,
    ]);

    return [$project, $collection];
}

test('content creation enforces field validations for primitive repeatable and group child fields', function (): void {
    $user = User::factory()->create();
    grantContentCreationPermission($user);
    [$project, $collection] = makeProjectCollectionWithValidationFields($user);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'title' => '',
            'author-email' => 'not-an-email',
            'rating' => 5,
            'theme' => '#xyzxyz',
            'tags' => [
                ['value' => 'ab'],
            ],
            'seo' => [
                [
                    'meta-title' => '',
                    'seo-contact-email' => 'broken-email',
                ],
            ],
        ],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors([
            'data.title',
            'data.author-email',
            'data.rating',
            'data.theme',
            'data.tags.0.value',
            'data.seo.0.meta-title',
            'data.seo.0.seo-contact-email',
        ]);
});

test('content creation enforces unique field validation across entries', function (): void {
    $user = User::factory()->create();
    grantContentCreationPermission($user);

    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Unique Title',
        'name' => 'uniquetitle',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [
            'required' => ['status' => true, 'message' => 'Title required'],
            'unique' => ['status' => true, 'message' => 'Title already exists'],
        ],
        'order' => 1,
    ]);

    $first = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'uniquetitle' => 'my-first-title',
        ],
    ]);

    $first->assertOk();

    $second = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'uniquetitle' => 'my-first-title',
        ],
    ]);

    $second->assertUnprocessable()
        ->assertJsonValidationErrors(['data.uniquetitle']);
});
