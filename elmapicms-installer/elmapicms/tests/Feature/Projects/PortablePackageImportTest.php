<?php

use App\Models\Asset;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\Project;
use App\Models\User;
use App\Services\AssetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function portablePackageUpload(array $manifest, array $files = []): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'elmapicms-test-package-');
    $zip = new ZipArchive;
    $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFromString('manifest.json', json_encode($manifest, JSON_THROW_ON_ERROR));
    foreach ($files as $archivePath => $contents) {
        $zip->addFromString($archivePath, $contents);
    }
    $zip->close();

    return new UploadedFile($path, 'portable-package.zip', 'application/zip', null, true);
}

function grantPortablePackagePermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('project zip import creates assets and reconnects media fields', function (): void {
    Storage::fake('public');
    $user = User::factory()->create();
    grantPortablePackagePermission($user, 'create_project');

    $assetReference = 'assets/asset-uuid-readme.txt';
    $manifest = [
        'format' => 'elmapicms',
        'version' => 1,
        'type' => 'project',
        'default_locale' => 'en',
        'locales' => ['en'],
        'assets' => [
            $assetReference => [
                'original_filename' => 'readme.txt',
                'mime_type' => 'text/plain',
                'size' => 14,
            ],
        ],
        'collections' => [
            [
                'name' => 'Pages',
                'slug' => 'pages',
                'is_singleton' => false,
                'fields' => [
                    [
                        'type' => 'media',
                        'label' => 'Attachment',
                        'name' => 'attachment',
                        'options' => [],
                        'validations' => [],
                    ],
                    [
                        'type' => 'media',
                        'label' => 'Gallery',
                        'name' => 'gallery',
                        'options' => ['repeatable' => true],
                        'validations' => [],
                    ],
                    [
                        'type' => 'group',
                        'label' => 'Blocks',
                        'name' => 'blocks',
                        'options' => ['repeatable' => true],
                        'validations' => [],
                        'children' => [
                            [
                                'type' => 'media',
                                'label' => 'Image',
                                'name' => 'image',
                                'options' => [],
                                'validations' => [],
                            ],
                        ],
                    ],
                ],
            ],
        ],
        'demo_data' => [
            [
                'collection' => 'pages',
                'entries' => [
                    [
                        'id' => 'e1',
                        'locale' => 'en',
                        'state' => 'published',
                        'fields' => [
                            'attachment' => [$assetReference],
                            'gallery' => [$assetReference],
                            'blocks' => [['image' => [$assetReference]]],
                        ],
                    ],
                ],
            ],
        ],
    ];

    $response = $this->actingAs($user)->post(route('projects.import', absolute: false), [
        'name' => 'Portable Project',
        'default_locale' => 'en',
        'description' => null,
        'import_file' => portablePackageUpload($manifest, [$assetReference => 'portable asset']),
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();
    $project = Project::query()->where('name', 'Portable Project')->firstOrFail();
    $asset = $project->assets()->firstOrFail();
    $entry = $project->collections()->where('slug', 'pages')->firstOrFail()->contentEntries()->firstOrFail();
    $mediaValues = $entry->fieldValues()->where('field_type', 'media')->get();

    $response->assertRedirect(route('projects.show', ['project' => $project], absolute: false));
    expect($asset->original_filename)->toBe('readme.txt');
    expect($mediaValues)->toHaveCount(3);
    $mediaValues->each(
        fn ($fieldValue) => expect($fieldValue->mediaRelations()->value('asset_id'))->toBe($asset->id),
    );
    Storage::disk('public')->assertExists($asset->path);
});

test('referenced asset project export round trips through zip import', function (): void {
    Storage::fake('public');
    $user = User::factory()->create();
    grantPortablePackagePermission($user, 'access_project_settings');
    grantPortablePackagePermission($user, 'create_project');
    $source = Project::factory()->create(['name' => 'Source', 'disk' => 'public']);
    $source->members()->attach($user);
    $collection = $source->collections()->create([
        'name' => 'Downloads',
        'slug' => 'downloads',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $field = $collection->allFields()->create([
        'project_id' => $source->id,
        'type' => 'media',
        'label' => 'File',
        'name' => 'file',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $asset = app(AssetService::class)->createAsset(
        $source,
        UploadedFile::fake()->createWithContent('portable.txt', 'round trip'),
        $user->id,
    );
    $entry = ContentEntry::create([
        'project_id' => $source->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'published',
        'created_by' => $user->id,
        'updated_by' => $user->id,
        'published_at' => now(),
    ]);
    $fieldValue = ContentFieldValue::create([
        'project_id' => $source->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $field->id,
        'field_type' => 'media',
        'json_value' => [$asset->id],
    ]);
    $fieldValue->mediaRelations()->create(['asset_id' => $asset->id, 'sort_order' => 0]);

    $exportResponse = $this->actingAs($user)->post(
        route('projects.settings.export-import.export-project', ['project' => $source], absolute: false),
        [
            'include_collections' => true,
            'include_content' => true,
            'asset_scope' => 'referenced',
        ],
    );
    $exportResponse->assertSuccessful();
    $zipPath = $exportResponse->baseResponse->getFile()->getPathname();

    $importResponse = $this->actingAs($user)->post(route('projects.import', absolute: false), [
        'name' => 'Imported Round Trip',
        'default_locale' => 'en',
        'description' => null,
        'import_file' => new UploadedFile($zipPath, 'source.zip', 'application/zip', null, true),
    ]);

    $target = Project::query()->where('name', 'Imported Round Trip')->firstOrFail();
    $importedValue = $target->collections()->where('slug', 'downloads')->firstOrFail()
        ->contentEntries()
        ->firstOrFail()
        ->fieldValues()
        ->where('field_type', 'media')
        ->firstOrFail();

    $importResponse->assertRedirect(route('projects.show', ['project' => $target], absolute: false));
    expect($target->assets()->value('original_filename'))->toBe('portable.txt')
        ->and($importedValue->mediaRelations()->count())->toBe(1);
});

test('json collection import matches a unique existing asset by original filename', function (): void {
    Storage::fake('public');
    $user = User::factory()->create();
    grantPortablePackagePermission($user, 'create_collection');
    $project = Project::factory()->create(['disk' => 'public']);
    $project->members()->attach($user);

    $asset = app(AssetService::class)->createAsset(
        $project,
        UploadedFile::fake()->createWithContent('guide.txt', 'existing asset'),
        $user->id,
    );
    $assetReference = 'assets/reference-guide.txt';
    $manifest = [
        'format' => 'elmapicms',
        'version' => 1,
        'type' => 'collection',
        'name' => 'Guides',
        'slug' => 'guides',
        'is_singleton' => false,
        'assets' => [
            $assetReference => [
                'original_filename' => 'guide.txt',
                'mime_type' => 'text/plain',
                'size' => 14,
            ],
        ],
        'fields' => [
            [
                'type' => 'media',
                'label' => 'Download',
                'name' => 'download',
                'options' => [],
                'validations' => [],
            ],
        ],
        'demo_data' => [
            [
                'collection' => 'guides',
                'entries' => [
                    [
                        'id' => 'e1',
                        'locale' => 'en',
                        'state' => 'draft',
                        'fields' => ['download' => [$assetReference]],
                    ],
                ],
            ],
        ],
    ];

    $response = $this->actingAs($user)->post(
        route('projects.collections.import', ['project' => $project], absolute: false),
        [
            'import_file' => UploadedFile::fake()->createWithContent(
                'collection.json',
                json_encode($manifest, JSON_THROW_ON_ERROR),
            ),
        ],
    );

    $collection = $project->collections()->where('slug', 'guides')->firstOrFail();
    $fieldValue = $collection->contentEntries()->firstOrFail()
        ->fieldValues()
        ->where('field_type', 'media')
        ->firstOrFail();

    $response->assertRedirect();
    expect(Asset::query()->where('project_id', $project->id)->count())->toBe(1);
    expect($fieldValue->mediaRelations()->value('asset_id'))->toBe($asset->id);
});

test('zip import rejects unsafe archive paths', function (): void {
    $user = User::factory()->create();
    grantPortablePackagePermission($user, 'create_project');
    $manifest = [
        'format' => 'elmapicms',
        'version' => 1,
        'type' => 'project',
        'assets' => [],
        'collections' => [],
    ];

    $response = $this->from('/')->actingAs($user)->post(route('projects.import', absolute: false), [
        'name' => 'Unsafe Project',
        'default_locale' => 'en',
        'description' => null,
        'import_file' => portablePackageUpload($manifest, ['../escape.txt' => 'unsafe']),
    ]);

    $response->assertRedirect('/');
    $response->assertSessionHasErrors('import_file');
    expect(Project::query()->where('name', 'Unsafe Project')->exists())->toBeFalse();
});

test('failed collection package import rolls back schema assets and stored files', function (): void {
    Storage::fake('public');
    $user = User::factory()->create();
    grantPortablePackagePermission($user, 'create_collection');
    $project = Project::factory()->create(['disk' => 'public']);
    $project->members()->attach($user);
    $assetReference = 'assets/rollback.txt';
    $manifest = [
        'format' => 'elmapicms',
        'version' => 1,
        'type' => 'collection',
        'name' => 'Broken',
        'slug' => 'broken',
        'assets' => [
            $assetReference => [
                'original_filename' => 'rollback.txt',
                'mime_type' => 'text/plain',
                'size' => 8,
            ],
        ],
        'fields' => [
            [
                'label' => 'Missing Type',
                'name' => 'missing_type',
                'options' => [],
                'validations' => [],
            ],
        ],
    ];

    $this->withoutExceptionHandling();

    expect(fn () => $this->actingAs($user)->post(
        route('projects.collections.import', ['project' => $project], absolute: false),
        ['import_file' => portablePackageUpload($manifest, [$assetReference => 'rollback'])],
    ))->toThrow(ErrorException::class);

    expect($project->collections()->count())->toBe(0)
        ->and($project->assets()->count())->toBe(0)
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});
