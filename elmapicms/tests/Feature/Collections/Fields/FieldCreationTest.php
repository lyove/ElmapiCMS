<?php

use App\Models\Field;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantCreateFieldPermission(User $user): void
{
    Permission::findOrCreate('create_field', 'web');
    $user->givePermissionTo('create_field');
}

function createProjectAndCollectionForFieldTests(User $user): array
{
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    return [$project, $collection];
}

function mergeFieldPayload(array $overrides = []): array
{
    return array_replace_recursive([
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'description' => 'Primary title field',
        'placeholder' => 'Enter a value',
        'options' => [
            'repeatable' => false,
            'hideInContentList' => false,
            'hiddenInAPI' => false,
        ],
        'validations' => [
            'required' => [
                'status' => false,
                'message' => '',
            ],
            'unique' => [
                'status' => false,
                'message' => '',
            ],
            'charcount' => [
                'status' => false,
                'type' => 'Between',
                'min' => null,
                'max' => null,
                'message' => '',
            ],
        ],
    ], $overrides);
}

test('authorized members can create every supported field type with options and validations', function (array $case): void {
    $user = User::factory()->create();
    grantCreateFieldPermission($user);
    [$project, $collection] = createProjectAndCollectionForFieldTests($user);

    $relatedCollection = $project->collections()->create([
        'name' => 'Related Entries',
        'slug' => 'related-entries',
        'order' => 2,
        'is_singleton' => false,
    ]);

    if ($case['type'] === 'slug') {
        $collection->allFields()->create([
            'type' => 'text',
            'label' => 'Source Title',
            'name' => 'source-title',
            'description' => null,
            'placeholder' => null,
            'options' => [],
            'validations' => [],
            'project_id' => $project->id,
            'order' => 1,
        ]);
    }

    $expectedOptions = json_decode(
        str_replace(
            '__RELATED_COLLECTION_ID__',
            (string) $relatedCollection->id,
            json_encode($case['options'])
        ),
        true
    );

    $payload = mergeFieldPayload([
        'type' => $case['type'],
        'label' => $case['label'],
        'name' => $case['name'],
        'options' => $expectedOptions,
        'validations' => $case['validations'],
    ]);

    $response = $this->actingAs($user)
        ->post(
            route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
            $payload
        );

    $response->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false));
    $response->assertSessionHas('success', 'Field created successfully');

    $field = Field::query()
        ->where('collection_id', $collection->id)
        ->where('name', $case['name'])
        ->firstOrFail();

    expect($field->type)->toBe($case['type']);
    expect($field->options)->toMatchArray($expectedOptions);
    expect($field->validations)->toMatchArray($case['validations']);
})->with([
    'text' => [[
        'type' => 'text',
        'label' => 'Headline',
        'name' => 'headline',
        'options' => ['repeatable' => true, 'hideInContentList' => true, 'hiddenInAPI' => false],
        'validations' => ['required' => ['status' => true, 'message' => 'Headline is required']],
    ]],
    'longtext' => [[
        'type' => 'longtext',
        'label' => 'Summary',
        'name' => 'summary',
        'options' => ['repeatable' => false, 'hideInContentList' => false, 'hiddenInAPI' => false],
        'validations' => ['charcount' => ['status' => true, 'type' => 'Min', 'min' => 20, 'max' => null, 'message' => 'Too short']],
    ]],
    'richtext' => [[
        'type' => 'richtext',
        'label' => 'Body',
        'name' => 'body',
        'options' => ['editor' => ['type' => 1, 'outputFormat' => 'lexical']],
        'validations' => ['required' => ['status' => true, 'message' => 'Body cannot be empty']],
    ]],
    'slug' => [[
        'type' => 'slug',
        'label' => 'Permalink',
        'name' => 'permalink',
        'options' => ['slug' => ['field' => 'source-title', 'readonly' => true]],
        'validations' => [],
    ]],
    'email' => [[
        'type' => 'email',
        'label' => 'Author Email',
        'name' => 'author-email',
        'options' => ['hiddenInAPI' => false],
        'validations' => ['required' => ['status' => true, 'message' => 'Email required']],
    ]],
    'password' => [[
        'type' => 'password',
        'label' => 'Secret',
        'name' => 'secret',
        'options' => [],
        'validations' => ['required' => ['status' => true, 'message' => 'Password required']],
    ]],
    'number' => [[
        'type' => 'number',
        'label' => 'Price',
        'name' => 'price',
        'options' => ['repeatable' => false],
        'validations' => ['charcount' => ['status' => true, 'type' => 'Between', 'min' => 1, 'max' => 9999, 'message' => 'Out of range']],
    ]],
    'enumeration' => [[
        'type' => 'enumeration',
        'label' => 'Category',
        'name' => 'category',
        'options' => ['enumeration' => ['list' => ['news', 'guides', 'events']], 'multiple' => true],
        'validations' => ['required' => ['status' => true, 'message' => 'Pick at least one']],
    ]],
    'boolean' => [[
        'type' => 'boolean',
        'label' => 'Featured',
        'name' => 'featured',
        'options' => ['hiddenInAPI' => true],
        'validations' => [],
    ]],
    'color' => [[
        'type' => 'color',
        'label' => 'Accent Color',
        'name' => 'accent-color',
        'options' => ['hiddenInAPI' => false],
        'validations' => [],
    ]],
    'date' => [[
        'type' => 'date',
        'label' => 'Publish Window',
        'name' => 'publish-window',
        'options' => ['includeTime' => true, 'mode' => 'range'],
        'validations' => ['required' => ['status' => true, 'message' => 'Date required']],
    ]],
    'time' => [[
        'type' => 'time',
        'label' => 'Publish Time',
        'name' => 'publish-time',
        'options' => ['hiddenInAPI' => false],
        'validations' => ['required' => ['status' => true, 'message' => 'Time required']],
    ]],
    'media' => [[
        'type' => 'media',
        'label' => 'Gallery',
        'name' => 'gallery',
        'options' => ['media' => ['type' => 2]],
        'validations' => ['required' => ['status' => true, 'message' => 'Media required']],
    ]],
    'relation' => [[
        'type' => 'relation',
        'label' => 'Related Articles',
        'name' => 'related-articles',
        'options' => ['relation' => ['collection' => '__RELATED_COLLECTION_ID__', 'type' => 2], 'includeDraft' => true],
        'validations' => [],
    ]],
    'json' => [[
        'type' => 'json',
        'label' => 'Metadata',
        'name' => 'metadata',
        'options' => ['hiddenInAPI' => false],
        'validations' => ['required' => ['status' => false, 'message' => '']],
    ]],
    'group' => [[
        'type' => 'group',
        'label' => 'SEO Group',
        'name' => 'seo-group',
        'options' => ['repeatable' => true],
        'validations' => [],
    ]],
]);

test('authorized members can create a child field under a group', function (): void {
    $user = User::factory()->create();
    grantCreateFieldPermission($user);
    [$project, $collection] = createProjectAndCollectionForFieldTests($user);

    $group = $collection->allFields()->create([
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'project_id' => $project->id,
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->post(
        route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
        mergeFieldPayload([
            'type' => 'text',
            'label' => 'Meta Title',
            'name' => 'meta-title',
            'parent_field_id' => $group->id,
        ])
    );

    $response->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false));

    $this->assertDatabaseHas('collection_fields', [
        'collection_id' => $collection->id,
        'parent_field_id' => $group->id,
        'name' => 'meta-title',
        'type' => 'text',
    ]);
});

test('group field creation requires options repeatable flag', function (): void {
    $user = User::factory()->create();
    grantCreateFieldPermission($user);
    [$project, $collection] = createProjectAndCollectionForFieldTests($user);

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->post(
            route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
            [
                'type' => 'group',
                'label' => 'Broken Group',
                'name' => 'broken-group',
                'description' => 'Missing repeatable option',
                'placeholder' => 'n/a',
                'options' => [],
                'validations' => [],
            ]
        )
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['options.repeatable']);
});

test('field creation validates name format and uniqueness within same parent scope', function (): void {
    $user = User::factory()->create();
    grantCreateFieldPermission($user);
    [$project, $collection] = createProjectAndCollectionForFieldTests($user);

    $this->actingAs($user)->post(
        route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
        mergeFieldPayload([
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
        ])
    )->assertRedirect();

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->post(
            route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
            mergeFieldPayload([
                'type' => 'text',
                'label' => 'Bad Name',
                'name' => 'Title With Spaces',
            ])
        )
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['name']);

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->post(
            route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
            mergeFieldPayload([
                'type' => 'longtext',
                'label' => 'Duplicate Name',
                'name' => 'title',
            ])
        )
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['name']);
});

test('same field name can be reused in different field groups', function (): void {
    $user = User::factory()->create();
    grantCreateFieldPermission($user);
    [$project, $collection] = createProjectAndCollectionForFieldTests($user);

    $groupA = $collection->allFields()->create([
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'project_id' => $project->id,
        'order' => 1,
    ]);

    $groupB = $collection->allFields()->create([
        'type' => 'group',
        'label' => 'Meta',
        'name' => 'meta',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'project_id' => $project->id,
        'order' => 2,
    ]);

    $this->actingAs($user)->post(
        route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
        mergeFieldPayload([
            'type' => 'text',
            'label' => 'Title in Group A',
            'name' => 'title',
            'parent_field_id' => $groupA->id,
        ])
    )->assertRedirect();

    $this->actingAs($user)->post(
        route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
        mergeFieldPayload([
            'type' => 'text',
            'label' => 'Title in Group B',
            'name' => 'title',
            'parent_field_id' => $groupB->id,
        ])
    )->assertRedirect();

    expect(
        Field::query()
            ->where('collection_id', $collection->id)
            ->where('name', 'title')
            ->whereIn('parent_field_id', [$groupA->id, $groupB->id])
            ->count()
    )->toBe(2);
});

test('parent field id must reference a top-level group in the same collection', function (): void {
    $user = User::factory()->create();
    grantCreateFieldPermission($user);
    [$project, $collection] = createProjectAndCollectionForFieldTests($user);

    $otherCollection = $project->collections()->create([
        'name' => 'Other Collection',
        'slug' => 'other-collection',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $nonGroup = $collection->allFields()->create([
        'type' => 'text',
        'label' => 'Regular',
        'name' => 'regular',
        'description' => null,
        'placeholder' => null,
        'options' => [],
        'validations' => [],
        'project_id' => $project->id,
        'order' => 1,
    ]);

    $externalGroup = $otherCollection->allFields()->create([
        'type' => 'group',
        'label' => 'External Group',
        'name' => 'external-group',
        'description' => null,
        'placeholder' => null,
        'options' => ['repeatable' => false],
        'validations' => [],
        'project_id' => $project->id,
        'order' => 1,
    ]);

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->post(
            route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
            mergeFieldPayload([
                'type' => 'text',
                'label' => 'Invalid Parent',
                'name' => 'invalid-parent',
                'parent_field_id' => $nonGroup->id,
            ])
        )
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['parent_field_id']);

    $this->actingAs($user)
        ->from(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->post(
            route('projects.collections.fields.store', ['project' => $project, 'collection' => $collection], absolute: false),
            mergeFieldPayload([
                'type' => 'text',
                'label' => 'External Parent',
                'name' => 'external-parent',
                'parent_field_id' => $externalGroup->id,
            ])
        )
        ->assertRedirect(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertInvalid(['parent_field_id']);
});
