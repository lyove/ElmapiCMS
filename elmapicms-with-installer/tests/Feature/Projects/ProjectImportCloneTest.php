<?php

use App\Models\Field;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantProjectAbility(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

function projectImportPayload(array $overrides = []): array
{
    $template = [
        'default_locale' => 'de',
        'locales' => ['de', 'en'],
        'public_api' => true,
        'collections' => [
            [
                'name' => 'Authors',
                'slug' => 'authors',
                'is_singleton' => false,
                'fields' => [
                    [
                        'type' => 'text',
                        'label' => 'Author Name',
                        'name' => 'author_name',
                        'options' => [],
                        'validations' => [],
                    ],
                ],
            ],
            [
                'name' => 'Articles',
                'slug' => 'articles',
                'is_singleton' => false,
                'fields' => [
                    [
                        'type' => 'text',
                        'label' => 'Title',
                        'name' => 'title',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'longtext',
                        'label' => 'Summary',
                        'name' => 'summary',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'richtext',
                        'label' => 'Body',
                        'name' => 'body',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'slug',
                        'label' => 'Slug',
                        'name' => 'slug',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'email',
                        'label' => 'Contact Email',
                        'name' => 'contact_email',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'password',
                        'label' => 'Access Password',
                        'name' => 'access_password',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'number',
                        'label' => 'Read Time',
                        'name' => 'read_time',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'enumeration',
                        'label' => 'Category',
                        'name' => 'category',
                        'options' => ['values' => ['news', 'blog']],
                        'validations' => [],
                    ],
                    [
                        'type' => 'boolean',
                        'label' => 'Featured',
                        'name' => 'featured',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'color',
                        'label' => 'Theme Color',
                        'name' => 'theme_color',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'date',
                        'label' => 'Publish Date',
                        'name' => 'publish_date',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'time',
                        'label' => 'Publish Time',
                        'name' => 'publish_time',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'media',
                        'label' => 'Hero Image',
                        'name' => 'hero_image',
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
                        'type' => 'json',
                        'label' => 'Metadata',
                        'name' => 'metadata',
                        'options' => [],
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
                            [
                                'type' => 'longtext',
                                'label' => 'SEO Description',
                                'name' => 'seo_description',
                                'options' => [],
                                'validations' => [],
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ];

    return array_merge([
        'name' => 'Imported Project',
        'default_locale' => 'en',
        'description' => 'Imported from JSON',
        'import_file' => UploadedFile::fake()->createWithContent(
            'project-template.json',
            json_encode($template, JSON_THROW_ON_ERROR)
        ),
    ], $overrides);
}

test('guests are redirected when importing a project', function (): void {
    $response = $this->post(route('projects.import', absolute: false), projectImportPayload());

    $response->assertRedirect(route('login', absolute: false));
    expect(Project::count())->toBe(0);
});

test('authenticated users without create_project permission cannot import a project', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('projects.import', absolute: false), projectImportPayload());

    $response->assertForbidden();
    expect(Project::count())->toBe(0);
});

test('authorized users can import a project from json and become members', function (): void {
    $user = User::factory()->create();
    grantProjectAbility($user, 'create_project');

    $response = $this->actingAs($user)->post(route('projects.import', absolute: false), projectImportPayload());

    $project = Project::query()->latest('id')->firstOrFail();

    $response->assertRedirect(route('projects.show', ['project' => $project], absolute: false));
    $this->assertDatabaseHas('projects', [
        'id' => $project->id,
        'name' => 'Imported Project',
        'default_locale' => 'de',
        'public_api' => true,
    ]);
    $this->assertDatabaseHas('project_user', [
        'project_id' => $project->id,
        'user_id' => $user->id,
    ]);
    $this->assertDatabaseHas('collections', [
        'project_id' => $project->id,
        'slug' => 'articles',
        'name' => 'Articles',
    ]);

    $articlesCollectionId = $project->collections()->where('slug', 'articles')->value('id');
    $authorsCollectionId = $project->collections()->where('slug', 'authors')->value('id');

    $expectedTypes = [
        'text', 'longtext', 'richtext', 'slug', 'email', 'password', 'number', 'enumeration',
        'boolean', 'color', 'date', 'time', 'media', 'relation', 'json', 'group',
    ];

    foreach ($expectedTypes as $type) {
        $this->assertDatabaseHas('collection_fields', [
            'project_id' => $project->id,
            'collection_id' => $articlesCollectionId,
            'type' => $type,
        ]);
    }

    $relationField = Field::query()
        ->where('collection_id', $articlesCollectionId)
        ->where('name', 'author')
        ->firstOrFail();
    expect($relationField->options['relation']['collection'])->toBe($authorsCollectionId);

    $this->assertDatabaseHas('collection_fields', [
        'project_id' => $project->id,
        'collection_id' => $articlesCollectionId,
        'name' => 'seo_title',
        'type' => 'text',
    ]);
    $this->assertDatabaseHas('collection_fields', [
        'project_id' => $project->id,
        'collection_id' => $articlesCollectionId,
        'name' => 'seo_description',
        'type' => 'longtext',
    ]);
});

test('import rejects invalid json files', function (): void {
    $user = User::factory()->create();
    grantProjectAbility($user, 'create_project');

    $invalidJsonFile = UploadedFile::fake()->createWithContent('invalid.json', '{invalid-json');

    $response = $this->from('/')->actingAs($user)->post(route('projects.import', absolute: false), [
        'name' => 'Invalid Import',
        'default_locale' => 'en',
        'description' => 'Should fail',
        'import_file' => $invalidJsonFile,
    ]);

    $response->assertRedirect('/');
    $response->assertSessionHasErrors('import_file');
    expect(Project::count())->toBe(0);
});

test('guests are redirected when cloning a project', function (): void {
    $sourceProject = Project::factory()->create([
        'name' => 'Source Project',
    ]);

    $this->post(route('projects.clone', ['project' => $sourceProject], absolute: false), [
        'name' => 'Cloned Project',
        'description' => 'Clone description',
    ])->assertRedirect(route('login', absolute: false));
});

test('authenticated users without create_project permission cannot clone a project', function (): void {
    $user = User::factory()->create();
    $sourceProject = Project::factory()->create([
        'name' => 'Source Project',
    ]);

    $this->actingAs($user)
        ->post(route('projects.clone', ['project' => $sourceProject], absolute: false), [
            'name' => 'Cloned Project',
            'description' => 'Clone description',
        ])
        ->assertForbidden();
});

test('authorized users can clone project structure', function (): void {
    $user = User::factory()->create();
    grantProjectAbility($user, 'create_project');

    $sourceProject = Project::factory()->create([
        'name' => 'Source Project',
        'default_locale' => 'en',
        'locales' => ['en'],
        'public_api' => false,
    ]);

    $authorsCollection = $sourceProject->collections()->create([
        'name' => 'Authors',
        'slug' => 'authors',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $authorsCollection->allFields()->create([
        'project_id' => $sourceProject->id,
        'type' => 'text',
        'label' => 'Author Name',
        'name' => 'author_name',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $collection = $sourceProject->collections()->create([
        'name' => 'Blog',
        'slug' => 'blog',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $collection->allFields()->createMany([
        [
            'project_id' => $sourceProject->id,
            'type' => 'text',
            'label' => 'Headline',
            'name' => 'headline',
            'options' => [],
            'validations' => [],
            'order' => 1,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'longtext',
            'label' => 'Summary',
            'name' => 'summary',
            'options' => [],
            'validations' => [],
            'order' => 2,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'richtext',
            'label' => 'Body',
            'name' => 'body',
            'options' => [],
            'validations' => [],
            'order' => 3,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'slug',
            'label' => 'Slug',
            'name' => 'slug',
            'options' => [],
            'validations' => [],
            'order' => 4,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'email',
            'label' => 'Contact Email',
            'name' => 'contact_email',
            'options' => [],
            'validations' => [],
            'order' => 5,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'password',
            'label' => 'Access Password',
            'name' => 'access_password',
            'options' => [],
            'validations' => [],
            'order' => 6,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'number',
            'label' => 'Read Time',
            'name' => 'read_time',
            'options' => [],
            'validations' => [],
            'order' => 7,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'enumeration',
            'label' => 'Category',
            'name' => 'category',
            'options' => ['values' => ['news', 'blog']],
            'validations' => [],
            'order' => 8,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'boolean',
            'label' => 'Featured',
            'name' => 'featured',
            'options' => [],
            'validations' => [],
            'order' => 9,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'color',
            'label' => 'Theme Color',
            'name' => 'theme_color',
            'options' => [],
            'validations' => [],
            'order' => 10,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'date',
            'label' => 'Publish Date',
            'name' => 'publish_date',
            'options' => [],
            'validations' => [],
            'order' => 11,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'time',
            'label' => 'Publish Time',
            'name' => 'publish_time',
            'options' => [],
            'validations' => [],
            'order' => 12,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'media',
            'label' => 'Hero Image',
            'name' => 'hero_image',
            'options' => [],
            'validations' => [],
            'order' => 13,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'relation',
            'label' => 'Author',
            'name' => 'author',
            'options' => ['relation' => ['collection' => $authorsCollection->id, 'type' => 1]],
            'validations' => [],
            'order' => 14,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'json',
            'label' => 'Metadata',
            'name' => 'metadata',
            'options' => [],
            'validations' => [],
            'order' => 15,
        ],
        [
            'project_id' => $sourceProject->id,
            'type' => 'group',
            'label' => 'SEO',
            'name' => 'seo',
            'options' => [],
            'validations' => [],
            'order' => 16,
        ],
    ]);

    $response = $this->actingAs($user)->post(route('projects.clone', ['project' => $sourceProject], absolute: false), [
        'name' => 'Cloned Project',
        'description' => 'Clone description',
    ]);

    $response->assertStatus(201);
    $response->assertJsonStructure(['redirect']);

    $clonedProject = Project::query()->where('name', 'Cloned Project')->firstOrFail();

    $this->assertDatabaseHas('projects', [
        'id' => $clonedProject->id,
        'default_locale' => 'en',
        'public_api' => false,
    ]);
    $this->assertDatabaseHas('project_user', [
        'project_id' => $clonedProject->id,
        'user_id' => $user->id,
    ]);
    $this->assertDatabaseHas('collections', [
        'project_id' => $clonedProject->id,
        'slug' => 'blog',
        'name' => 'Blog',
    ]);
    $this->assertDatabaseHas('collections', [
        'project_id' => $clonedProject->id,
        'slug' => 'authors',
        'name' => 'Authors',
    ]);

    $clonedCollectionId = $clonedProject->collections()->where('slug', 'blog')->value('id');
    $expectedTypes = [
        'text', 'longtext', 'richtext', 'slug', 'email', 'password', 'number', 'enumeration',
        'boolean', 'color', 'date', 'time', 'media', 'relation', 'json', 'group',
    ];

    foreach ($expectedTypes as $type) {
        $this->assertDatabaseHas('collection_fields', [
            'project_id' => $clonedProject->id,
            'collection_id' => $clonedCollectionId,
            'type' => $type,
        ]);
    }
});

dataset('project locale options', [
    'single locale' => ['en', ['en']],
    'multi locale' => ['tr', ['tr', 'en', 'de']],
]);

test('import applies single and multi locale options from template', function (string $defaultLocale, array $locales): void {
    $user = User::factory()->create();
    grantProjectAbility($user, 'create_project');

    $template = [
        'default_locale' => $defaultLocale,
        'locales' => $locales,
        'public_api' => false,
        'collections' => [],
    ];

    $payload = [
        'name' => 'Locale Import Project',
        'default_locale' => 'fr',
        'description' => 'Locale import test',
        'import_file' => UploadedFile::fake()->createWithContent(
            'locale-template.json',
            json_encode($template, JSON_THROW_ON_ERROR)
        ),
    ];

    $response = $this->actingAs($user)->post(route('projects.import', absolute: false), $payload);

    $project = Project::query()->latest('id')->firstOrFail();

    $response->assertRedirect(route('projects.show', ['project' => $project], absolute: false));
    expect($project->default_locale)->toBe($defaultLocale);
    expect($project->locales)->toBe($locales);
})->with('project locale options');

test('clone preserves single and multi locale options from source project', function (string $defaultLocale, array $locales): void {
    $user = User::factory()->create();
    grantProjectAbility($user, 'create_project');

    $sourceProject = Project::factory()->create([
        'name' => 'Locale Source Project',
        'default_locale' => $defaultLocale,
        'locales' => $locales,
        'public_api' => true,
    ]);

    $response = $this->actingAs($user)->post(route('projects.clone', ['project' => $sourceProject], absolute: false), [
        'name' => 'Locale Cloned Project',
        'description' => 'Locale clone test',
    ]);

    $response->assertStatus(201);

    $clonedProject = Project::query()->where('name', 'Locale Cloned Project')->firstOrFail();

    expect($clonedProject->default_locale)->toBe($defaultLocale);
    expect($clonedProject->locales)->toBe($locales);
    expect($clonedProject->public_api)->toBeFalse();
})->with('project locale options');

test('clone validates required and allowed project name format', function (): void {
    $user = User::factory()->create();
    grantProjectAbility($user, 'create_project');

    $sourceProject = Project::factory()->create([
        'name' => 'Source Project',
    ]);

    $this->actingAs($user)->post(route('projects.clone', ['project' => $sourceProject], absolute: false), [
        'name' => '',
        'description' => 'No name',
    ])->assertInvalid(['name']);

    $this->actingAs($user)->post(route('projects.clone', ['project' => $sourceProject], absolute: false), [
        'name' => 'Invalid # Clone',
        'description' => 'Invalid chars',
    ])->assertInvalid(['name']);
});
