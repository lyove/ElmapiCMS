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

function createUploaderContext(): array
{
    $user = User::factory()->create();
    $project = Project::factory()->create(['disk' => 'public']);
    $project->members()->attach($user->id);

    Permission::findOrCreate('upload_asset', 'web');
    $user->givePermissionTo('upload_asset');

    return [$user, $project];
}

test('asset upload stores image and generates metadata thumbnail and original file', function () {
    [$user, $project] = createUploaderContext();

    $response = $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->image('cover-photo.jpg', 1280, 720),
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);

    $asset = Asset::query()->firstOrFail()->load('metadata');

    expect($asset->extension)->toBe('webp')
        ->and($asset->mime_type)->toBe('image/webp')
        ->and($asset->metadata)->not->toBeNull()
        ->and($asset->metadata?->width)->toBe(1280)
        ->and($asset->metadata?->height)->toBe(720)
        ->and($asset->metadata?->alt_text)->toBe('cover-photo');

    Storage::disk('public')->assertExists($asset->path);
    Storage::disk('public')->assertExists($asset->original_path);
    Storage::disk('public')->assertExists($asset->getThumbnailPath());
    expect($asset->created_by)->toBe($user->id)
        ->and($asset->updated_by)->toBe($user->id);
});

test('asset upload allows non image file types from allow list', function () {
    [$user, $project] = createUploaderContext();

    $response = $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->create('manual.pdf', 24, 'application/pdf'),
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);

    $asset = Asset::query()->firstOrFail();

    expect($asset->extension)->toBe('pdf')
        ->and($asset->original_path)->toBeNull();

    Storage::disk('public')->assertExists($asset->path);
});

test('asset upload rejects unsupported file types', function () {
    [$user, $project] = createUploaderContext();

    $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->create('bad-script.php', 10, 'text/x-php'),
    ])
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['errors' => ['file']]);
});

test('asset upload rejects svg files for security hardening', function () {
    [$user, $project] = createUploaderContext();

    $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->create('vector.svg', 5, 'image/svg+xml'),
    ])
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['errors' => ['file']]);
});

test('asset upload validates missing file', function () {
    [$user, $project] = createUploaderContext();

    $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [])
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['errors' => ['file']]);
});

test('asset upload enforces configured max file size', function () {
    [$user, $project] = createUploaderContext();

    $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->create('too-large.pdf', 300000, 'application/pdf'),
    ])
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonStructure([
            'errors' => ['file'],
            'file_size_limit',
        ]);
});

test('asset upload requires upload permission', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['disk' => 'public']);
    $project->members()->attach($user->id);

    $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->image('no-permission.jpg', 600, 400),
    ])->assertForbidden();
});

test('non members cannot upload assets even with permission', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['disk' => 'public']);

    Permission::findOrCreate('upload_asset', 'web');
    $user->givePermissionTo('upload_asset');

    $this->actingAs($user)->post(route('assets.upload', [$project->id], absolute: false), [
        'file' => UploadedFile::fake()->image('outsider.jpg', 600, 400),
    ])->assertForbidden();
});
