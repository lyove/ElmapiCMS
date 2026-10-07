<?php

use App\Models\Asset;
use App\Models\Project;
use App\Models\User;
use App\Services\DirectAssetUploadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    config([
        'filesystems.default' => 'public',
        'assets.direct_upload.enabled' => false,
    ]);
});

function createDirectUploadContext(array $projectAttributes = []): array
{
    $user = User::factory()->create();
    $project = Project::factory()->create(array_merge(['disk' => 'public'], $projectAttributes));
    $project->members()->attach($user->id);

    Permission::findOrCreate('upload_asset', 'web');
    $user->givePermissionTo('upload_asset');

    return [$user, $project];
}

test('direct upload initiate rejects disallowed extension', function () {
    [$user, $project] = createDirectUploadContext(['disk' => 's3']);
    config(['assets.direct_upload.enabled' => true]);

    $this->actingAs($user)->postJson(route('assets.upload-url', $project->id), [
        'original_filename' => 'virus.exe',
        'byte_size' => 100,
    ])
        ->assertUnprocessable();
});

test('direct upload initiate rejects when direct upload is not available', function () {
    [$user, $project] = createDirectUploadContext(['disk' => 'public']);
    config(['assets.direct_upload.enabled' => false]);

    $this->actingAs($user)->postJson(route('assets.upload-url', $project->id), [
        'original_filename' => 'doc.pdf',
        'byte_size' => 100,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['direct_upload']);
});

test('direct upload initiate rejects when project disk is not s3 even if flag enabled', function () {
    [$user, $project] = createDirectUploadContext(['disk' => 'public']);
    config(['assets.direct_upload.enabled' => true]);

    $this->actingAs($user)->postJson(route('assets.upload-url', $project->id), [
        'original_filename' => 'doc.pdf',
        'byte_size' => 100,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['direct_upload']);
});

test('direct upload finalize delegates to direct upload service', function () {
    [$user, $project] = createDirectUploadContext(['disk' => 's3']);
    config(['assets.direct_upload.enabled' => true]);

    $asset = Asset::query()->create([
        'project_id' => $project->id,
        'filename' => 'x.webp',
        'original_filename' => 'x.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 10,
        'disk' => 'public',
        'path' => 'projects/'.$project->uuid.'/assets/x.webp',
        'original_path' => null,
    ]);

    $this->mock(DirectAssetUploadService::class, function ($mock) use ($asset) {
        $mock->shouldReceive('finalizeSinglePut')->once()->andReturn($asset);
    });

    $this->actingAs($user)->postJson(route('assets.upload-finalize', $project->id), [
        'intent_uuid' => '550e8400-e29b-41d4-a716-446655440000',
    ])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('asset.id', $asset->id);
});

test('classic asset upload still works when direct upload is disabled', function () {
    [$user, $project] = createDirectUploadContext(['disk' => 'public']);
    config(['assets.direct_upload.enabled' => false]);

    $response = $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->create('manual.pdf', 24, 'application/pdf'),
    ]);

    $response->assertOk()->assertJsonPath('success', true);
    expect(Asset::query()->count())->toBe(1);
});
