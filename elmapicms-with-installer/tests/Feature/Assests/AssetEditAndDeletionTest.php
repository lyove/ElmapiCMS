<?php

use App\Models\Asset;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    config(['filesystems.default' => 'public']);
});

function createAssetManagerContext(): array
{
    $user = User::factory()->create();
    $project = Project::factory()->create(['disk' => 'public']);
    $project->members()->attach($user->id);

    foreach (['upload_asset', 'update_asset', 'delete_asset', 'access_assets'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user->givePermissionTo(['upload_asset', 'update_asset', 'delete_asset', 'access_assets']);

    return [$user, $project];
}

function uploadImageAsset(User $user, Project $project, string $name = 'editable.jpg', int $width = 1200, int $height = 800): Asset
{
    $response = test()->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->image($name, $width, $height),
    ]);

    $response->assertOk()->assertJsonPath('success', true);

    return Asset::query()->latest('id')->firstOrFail();
}

test('app metadata update endpoint updates file metadata', function () {
    [$user, $project] = createAssetManagerContext();
    $asset = uploadImageAsset($user, $project);

    $this->actingAs($user)->put(route('assets.api.update', [$project->id, $asset->id], absolute: false), [
        'alt_text' => 'Updated alt text',
        'title' => 'Homepage Banner',
        'caption' => 'Updated caption',
        'description' => 'Updated description',
        'author' => 'Editor User',
        'copyright' => 'ACME',
    ])
        ->assertOk()
        ->assertJsonPath('metadata.alt_text', 'Updated alt text')
        ->assertJsonPath('metadata.title', 'Homepage Banner');

    $this->assertDatabaseHas('asset_metadata', [
        'asset_id' => $asset->id,
        'alt_text' => 'Updated alt text',
        'title' => 'Homepage Banner',
        'author' => 'Editor User',
    ]);
});

test('app metadata update validates max length fields', function () {
    [$user, $project] = createAssetManagerContext();
    $asset = uploadImageAsset($user, $project);

    $this->actingAs($user)->put(route('assets.api.update', [$project->id, $asset->id], absolute: false), [
        'title' => str_repeat('A', 256),
    ])->assertInvalid(['title']);
});

test('app delete removes asset files and soft deletes row', function () {
    [$user, $project] = createAssetManagerContext();
    $asset = uploadImageAsset($user, $project, 'delete-target.jpg', 900, 600);

    $mainPath = $asset->path;
    $originalPath = $asset->original_path;
    $thumbnailPath = $asset->getThumbnailPath();

    $this->actingAs($user)
        ->deleteJson(route('assets.destroy', [$project->id, $asset->id], absolute: false))
        ->assertOk()
        ->assertJsonPath('success', true);

    Storage::disk('public')->assertMissing($mainPath);
    Storage::disk('public')->assertMissing($originalPath);
    Storage::disk('public')->assertMissing($thumbnailPath);
    $this->assertSoftDeleted('assets', ['id' => $asset->id]);
});

test('app bulk delete removes selected assets only', function () {
    [$user, $project] = createAssetManagerContext();
    $first = uploadImageAsset($user, $project, 'first.jpg');
    $second = uploadImageAsset($user, $project, 'second.jpg');
    $third = uploadImageAsset($user, $project, 'third.jpg');

    $this->actingAs($user)->postJson(route('assets.bulk-destroy', [$project->id], absolute: false), [
        'asset_ids' => [$first->id, $third->id],
    ])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('count', 2);

    $this->assertSoftDeleted('assets', ['id' => $first->id]);
    $this->assertDatabaseHas('assets', ['id' => $second->id, 'deleted_at' => null]);
    $this->assertSoftDeleted('assets', ['id' => $third->id]);
});

test('app bulk delete count matches assets deleted in current project', function () {
    [$user, $project] = createAssetManagerContext();
    $otherProject = Project::factory()->create(['disk' => 'public']);

    $localAsset = uploadImageAsset($user, $project, 'local-count.jpg');
    $foreignAsset = Asset::create([
        'project_id' => $otherProject->id,
        'filename' => 'foreign-count.webp',
        'original_filename' => 'foreign-count.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 1000,
        'disk' => 'public',
        'path' => "projects/{$otherProject->uuid}/assets/foreign-count.webp",
    ]);
    Storage::disk('public')->put($foreignAsset->path, 'foreign');

    $this->actingAs($user)->postJson(route('assets.bulk-destroy', [$project->id], absolute: false), [
        'asset_ids' => [$localAsset->id, $foreignAsset->id],
    ])
        ->assertOk()
        ->assertJsonPath('count', 1);
});

test('app image edit crop operation updates metadata dimensions', function () {
    [$user, $project] = createAssetManagerContext();
    $asset = uploadImageAsset($user, $project, 'crop-source.jpg', 1000, 800);

    $this->actingAs($user)->put(route('assets.crop', [$project->id, $asset->id], absolute: false), [
        'file' => UploadedFile::fake()->image('cropped.jpg', 320, 240),
    ])->assertOk();

    $asset->refresh()->load('metadata');

    expect($asset->metadata?->width)->toBe(320)
        ->and($asset->metadata?->height)->toBe(240);
});

test('app image edit resize operation updates metadata dimensions', function () {
    [$user, $project] = createAssetManagerContext();
    $asset = uploadImageAsset($user, $project, 'resize-source.jpg', 1200, 900);

    $this->actingAs($user)->put(route('assets.crop', [$project->id, $asset->id], absolute: false), [
        'file' => UploadedFile::fake()->image('resized.jpg', 640, 360),
    ])->assertOk();

    $asset->refresh()->load('metadata');

    expect($asset->metadata?->width)->toBe(640)
        ->and($asset->metadata?->height)->toBe(360);
});

test('app image edit rotate operation persists rotated dimensions', function () {
    [$user, $project] = createAssetManagerContext();
    $asset = uploadImageAsset($user, $project, 'rotate-source.jpg', 900, 500);

    $this->actingAs($user)->put(route('assets.crop', [$project->id, $asset->id], absolute: false), [
        'file' => UploadedFile::fake()->image('rotated.jpg', 500, 900),
    ])->assertOk();

    $asset->refresh()->load('metadata');

    expect($asset->metadata?->width)->toBe(500)
        ->and($asset->metadata?->height)->toBe(900);
});

test('app image edit crop endpoint rejects non image uploads', function () {
    [$user, $project] = createAssetManagerContext();
    $asset = uploadImageAsset($user, $project, 'crop-validation.jpg', 800, 600);

    $this->actingAs($user)->put(route('assets.crop', [$project->id, $asset->id], absolute: false), [
        'file' => UploadedFile::fake()->create('not-image.pdf', 12, 'application/pdf'),
    ])->assertInvalid(['file']);
});

test('crop endpoint requires an uploaded file', function () {
    [$user, $project] = createAssetManagerContext();
    $asset = uploadImageAsset($user, $project, 'no-file-crop.jpg', 700, 500);

    $this->actingAs($user)
        ->putJson(route('assets.crop', [$project->id, $asset->id], absolute: false), [])
        ->assertInvalid(['file']);
});

test('non members cannot update delete or crop assets even with permissions', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['disk' => 'public']);
    $member = User::factory()->create();
    $project->members()->attach($member->id);

    foreach (['upload_asset', 'update_asset', 'delete_asset'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user->givePermissionTo(['upload_asset', 'update_asset', 'delete_asset']);
    $member->givePermissionTo('upload_asset');

    $asset = uploadImageAsset($member, $project, 'member-only.jpg', 640, 480);

    $this->actingAs($user)->put(route('assets.api.update', [$project->id, $asset->id], absolute: false), [
        'title' => 'Forbidden',
    ])->assertForbidden();

    $this->actingAs($user)
        ->delete(route('assets.destroy', [$project->id, $asset->id], absolute: false))
        ->assertForbidden();

    $this->actingAs($user)->put(route('assets.crop', [$project->id, $asset->id], absolute: false), [
        'file' => UploadedFile::fake()->image('blocked.jpg', 100, 100),
    ])->assertForbidden();
});

test('cross project asset operations return not found for member with permissions', function () {
    [$user, $project] = createAssetManagerContext();
    $otherProject = Project::factory()->create(['disk' => 'public']);
    $otherProject->members()->attach($user->id);

    $foreignAsset = Asset::create([
        'project_id' => $otherProject->id,
        'filename' => 'foreign.webp',
        'original_filename' => 'foreign.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 1000,
        'disk' => 'public',
        'path' => "projects/{$otherProject->uuid}/assets/foreign.webp",
    ]);

    $this->actingAs($user)->put(route('assets.api.update', [$project->id, $foreignAsset->id], absolute: false), [
        'title' => 'Should not update',
    ])->assertNotFound();

    $this->actingAs($user)
        ->delete(route('assets.destroy', [$project->id, $foreignAsset->id], absolute: false))
        ->assertNotFound();

    $this->actingAs($user)->put(route('assets.crop', [$project->id, $foreignAsset->id], absolute: false), [
        'file' => UploadedFile::fake()->image('blocked-update.jpg', 200, 200),
    ])->assertNotFound();
});
