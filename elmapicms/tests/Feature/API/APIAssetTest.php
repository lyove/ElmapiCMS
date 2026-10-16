<?php

use App\Models\Asset;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    config(['filesystems.default' => 'public']);

    $this->project = Project::factory()->create([
        'disk' => 'public',
        'public_api' => false,
    ]);

    $this->token = $this->project->createToken('asset-token', ['create', 'read', 'delete'])->plainTextToken;
    $this->apiHeaders = fn () => [
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$this->token}",
    ];
});

test('image uploads are stored as optimized webp with original file and thumbnail', function () {
    $response = $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('cover-photo.jpg', 1800, 1200),
        ]);

    $response->assertCreated();

    $asset = Asset::query()->firstOrFail();

    expect($asset->extension)->toBe('webp')
        ->and($asset->mime_type)->toBe('image/webp')
        ->and($asset->path)->toEndWith('.webp')
        ->and($asset->original_path)->not->toBeNull()
        ->and($asset->original_path)->toContain('/originals/')
        ->and($asset->size)->toBeGreaterThan(0);

    Storage::disk('public')->assertExists($asset->path);
    Storage::disk('public')->assertExists($asset->original_path);
    Storage::disk('public')->assertExists($asset->getThumbnailPath());
});

test('asset api response includes optimized and original urls', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('hero-image.png', 1400, 900),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail();

    $response = $this->withHeaders(($this->apiHeaders)())
        ->get("/api/files/{$asset->uuid}");

    $response->assertOk()->assertJsonStructure([
        'uuid',
        'filename',
        'mime_type',
        'size',
        'url',
        'original_url',
        'thumbnail_url',
    ]);

    $response->assertJsonPath('url', Storage::disk('public')->url($asset->path));
    $response->assertJsonPath('original_url', Storage::disk('public')->url($asset->original_path));
});

test('asset can be fetched by numeric identifier', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('numeric-id.jpg', 1200, 800),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail();

    $this->withHeaders(($this->apiHeaders)())
        ->get("/api/files/{$asset->id}")
        ->assertOk()
        ->assertJsonPath('uuid', $asset->uuid);
});

test('asset can be fetched by original filename', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('named-asset.jpg', 1000, 700),
        ])
        ->assertCreated();

    $this->withHeaders(($this->apiHeaders)())
        ->get('/api/files/name/named-asset.jpg')
        ->assertOk()
        ->assertJsonPath('filename', 'named-asset.jpg');
});

test('deleting optimized image removes optimized file thumbnail and original file', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('gallery-image.jpeg', 1600, 1000),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail();
    $mainPath = $asset->path;
    $thumbnailPath = $asset->getThumbnailPath();
    $originalPath = $asset->original_path;

    $this->withHeaders(($this->apiHeaders)())
        ->delete("/api/files/{$asset->uuid}")
        ->assertOk()
        ->assertJsonPath('success', true);

    Storage::disk('public')->assertMissing($mainPath);
    Storage::disk('public')->assertMissing($thumbnailPath);
    Storage::disk('public')->assertMissing($originalPath);
    $this->assertSoftDeleted('assets', ['id' => $asset->id]);
});

test('force deleting an asset permanently removes the database record', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('force-delete.jpg', 1400, 900),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail();

    $this->withHeaders(($this->apiHeaders)())
        ->delete("/api/files/{$asset->uuid}?force=1")
        ->assertOk()
        ->assertJsonPath('success', true);

    $this->assertDatabaseMissing('assets', ['id' => $asset->id]);
});

test('asset upload endpoint requires create ability', function () {
    $readOnlyToken = $this->project->createToken('read-only', ['read'])->plainTextToken;

    $readOnlyHeaders = [
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$readOnlyToken}",
    ];

    $this->withHeaders($readOnlyHeaders)
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('not-allowed-upload.jpg', 800, 600),
        ])
        ->assertForbidden();
});

test('asset delete endpoint returns not found for unknown identifier', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->delete('/api/files/unknown-asset-identifier')
        ->assertNotFound();
});

test('api upload rejects svg files for security hardening', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->create('unsafe.svg', 5, 'image/svg+xml'),
        ])
        ->assertUnprocessable();
});
