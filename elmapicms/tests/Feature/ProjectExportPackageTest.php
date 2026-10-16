<?php

use App\Models\Asset;
use App\Models\ContentEntry;
use App\Models\ContentFieldGroup;
use App\Models\ContentFieldValue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

uses(RefreshDatabase::class);

function createExportPackageAsset(
    Project $project,
    User $user,
    string $originalFilename,
    string $path,
    string $contents,
    ?string $originalPath = null
): Asset {
    Storage::disk('remote')->put($path, 'processed-'.$contents);
    if ($originalPath !== null) {
        Storage::disk('remote')->put($originalPath, $contents);
    }

    return Asset::create([
        'project_id' => $project->id,
        'filename' => basename($path),
        'original_filename' => $originalFilename,
        'mime_type' => 'image/jpeg',
        'extension' => 'jpg',
        'size' => strlen($contents),
        'disk' => 'remote',
        'path' => $path,
        'original_path' => $originalPath,
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
}

beforeEach(function (): void {
    Storage::fake('remote');
    Permission::findOrCreate('access_project_settings', 'web');
});

test('json export uses versioned collision safe media references including grouped media', function (): void {
    $user = User::factory()->create();
    $user->givePermissionTo('access_project_settings');
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $galleryField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'media',
        'label' => 'Gallery',
        'name' => 'gallery',
        'options' => ['media' => ['type' => 2]],
        'validations' => [],
        'order' => 1,
    ]);
    $groupField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'Blocks',
        'name' => 'blocks',
        'options' => ['repeatable' => true],
        'validations' => [],
        'order' => 2,
    ]);
    $groupMediaField = $collection->allFields()->create([
        'project_id' => $project->id,
        'parent_field_id' => $groupField->id,
        'type' => 'media',
        'label' => 'Image',
        'name' => 'image',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $firstAsset = createExportPackageAsset(
        $project,
        $user,
        'Hero Image.jpg',
        'processed/hero-one.jpg',
        'first-original',
        'originals/hero-one.jpg'
    );
    $secondAsset = createExportPackageAsset(
        $project,
        $user,
        'Hero Image.jpg',
        'processed/hero-two.jpg',
        'second-original'
    );
    $entry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'published',
        'created_by' => $user->id,
        'updated_by' => $user->id,
        'published_at' => now(),
    ]);
    $galleryValue = ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $galleryField->id,
        'field_type' => 'media',
    ]);
    $galleryValue->mediaRelations()->createMany([
        ['asset_id' => $firstAsset->id, 'sort_order' => 0],
        ['asset_id' => $secondAsset->id, 'sort_order' => 1],
    ]);
    ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $groupField->id,
        'field_type' => 'group',
    ]);
    $group = ContentFieldGroup::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $groupField->id,
        'sort_order' => 0,
    ]);
    $groupMediaValue = ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'group_instance_id' => $group->id,
        'field_id' => $groupMediaField->id,
        'field_type' => 'media',
    ]);
    $groupMediaValue->mediaRelations()->create([
        'asset_id' => $firstAsset->id,
        'sort_order' => 0,
    ]);
    $publishedVersion = $entry->versions()->create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'version_number' => 1,
        'snapshot' => [
            'fields' => [
                'gallery' => [
                    ['uuid' => $firstAsset->uuid],
                    ['uuid' => $secondAsset->uuid],
                ],
                'blocks' => [
                    ['image' => [['uuid' => $firstAsset->uuid]]],
                ],
            ],
            'meta' => [],
        ],
        'published_at' => now(),
        'created_by' => $user->id,
    ]);
    $entry->update([
        'published_version_id' => $publishedVersion->id,
        'published_version_number' => 1,
    ]);

    $response = $this->actingAs($user)->post(
        route('projects.settings.export-import.export-project', $project, absolute: false),
        [
            'include_collections' => true,
            'include_content' => true,
            'asset_scope' => 'none',
        ]
    );

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonPath('format', 'elmapicms')
        ->assertJsonPath('version', 1)
        ->assertJsonPath('type', 'project');

    $manifest = $response->json();
    $assetPaths = array_keys($manifest['assets']);

    expect($assetPaths)->toHaveCount(2)
        ->and($assetPaths[0])->toStartWith('assets/'.$firstAsset->uuid.'-')
        ->and($assetPaths[1])->toStartWith('assets/'.$secondAsset->uuid.'-')
        ->and($manifest['demo_data'][0]['entries'][0]['fields']['gallery'])->toBe($assetPaths)
        ->and($manifest['demo_data'][0]['entries'][0]['fields']['blocks'][0]['image'])->toBe([$assetPaths[0]])
        ->and($manifest['assets'][$assetPaths[0]])->toMatchArray([
            'uuid' => $firstAsset->uuid,
            'original_filename' => 'Hero Image.jpg',
            'mime_type' => 'image/jpeg',
            'size' => strlen('first-original'),
        ]);
});

test('collection asset scopes build remote-safe zips with original binaries', function (): void {
    $user = User::factory()->create();
    $user->givePermissionTo('access_project_settings');
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $referencedAsset = createExportPackageAsset(
        $project,
        $user,
        'hero.jpg',
        'processed/hero.jpg',
        'original-hero',
        'originals/hero.jpg'
    );
    $unreferencedAsset = createExportPackageAsset(
        $project,
        $user,
        'library.jpg',
        'library.jpg',
        'library-binary'
    );
    $deletedAsset = createExportPackageAsset(
        $project,
        $user,
        'deleted.jpg',
        'deleted.jpg',
        'deleted-binary'
    );
    $deletedAsset->delete();

    $mediaField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'media',
        'label' => 'Hero',
        'name' => 'hero',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $entry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'published',
        'created_by' => $user->id,
        'updated_by' => $user->id,
        'published_at' => now(),
    ]);
    $mediaValue = ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $mediaField->id,
        'field_type' => 'media',
    ]);
    $mediaValue->mediaRelations()->create([
        'asset_id' => $referencedAsset->id,
        'sort_order' => 0,
    ]);

    $response = $this->actingAs($user)->post(
        route('projects.settings.export-import.export-collection', [
            'project' => $project,
            'collection' => $collection,
        ], absolute: false),
        [
            'include_content' => true,
            'asset_scope' => 'all',
        ]
    );

    $response->assertOk()->assertHeader('Content-Type', 'application/zip');
    expect($response->baseResponse)->toBeInstanceOf(BinaryFileResponse::class);

    $zip = new ZipArchive;
    $zipPath = $response->baseResponse->getFile()->getPathname();
    expect($zip->open($zipPath))->toBeTrue();

    $manifest = json_decode($zip->getFromName('manifest.json'), true, 512, JSON_THROW_ON_ERROR);
    $referencedPath = 'assets/'.$referencedAsset->uuid.'-hero.jpg';
    $unreferencedPath = 'assets/'.$unreferencedAsset->uuid.'-library.jpg';

    expect($manifest['type'])->toBe('collection')
        ->and($manifest['asset_scope'])->toBe('all')
        ->and(array_keys($manifest['assets']))->toBe([$referencedPath, $unreferencedPath])
        ->and($manifest['demo_data'][0]['entries'][0]['fields']['hero'])->toBe([$referencedPath])
        ->and($zip->getFromName($referencedPath))->toBe('original-hero')
        ->and($zip->getFromName($unreferencedPath))->toBe('processed-library-binary')
        ->and($zip->locateName('assets/'.$deletedAsset->uuid.'-deleted.jpg'))->toBeFalse();

    $zip->close();
    @unlink($zipPath);

    $referencedResponse = $this->actingAs($user)->post(
        route('projects.settings.export-import.export-collection', [
            'project' => $project,
            'collection' => $collection,
        ], absolute: false),
        [
            'include_content' => true,
            'asset_scope' => 'referenced',
        ]
    );

    $referencedResponse->assertOk()->assertHeader('Content-Type', 'application/zip');
    $referencedZip = new ZipArchive;
    $referencedZipPath = $referencedResponse->baseResponse->getFile()->getPathname();
    expect($referencedZip->open($referencedZipPath))->toBeTrue();
    $referencedManifest = json_decode(
        $referencedZip->getFromName('manifest.json'),
        true,
        512,
        JSON_THROW_ON_ERROR
    );

    expect(array_keys($referencedManifest['assets']))->toBe([$referencedPath])
        ->and($referencedZip->locateName($unreferencedPath))->toBeFalse();

    $referencedZip->close();
    @unlink($referencedZipPath);
});

test('referenced scope requires content', function (): void {
    $user = User::factory()->create();
    $user->givePermissionTo('access_project_settings');
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->withHeader('Accept', 'application/json')
        ->post(route('projects.settings.export-import.export-project', $project, absolute: false), [
            'include_content' => false,
            'asset_scope' => 'referenced',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('asset_scope');
});
