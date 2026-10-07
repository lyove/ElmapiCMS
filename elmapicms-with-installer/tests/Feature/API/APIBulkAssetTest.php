<?php

use App\Models\Asset;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function bulkAssetHeaders(Project $project, string $token): array
{
    return [
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ];
}

beforeEach(function () {
    Storage::fake('public');
    config(['filesystems.default' => 'public']);

    $this->project = Project::factory()->create([
        'disk' => 'public',
        'public_api' => false,
    ]);

    $this->token = $this->project
        ->createToken('bulk-asset-token', ['create', 'read', 'update', 'delete'])
        ->plainTextToken;
});

test('bulk asset upload stores multiple files', function () {
    $response = $this->withHeaders(bulkAssetHeaders($this->project, $this->token))
        ->post('/api/files/bulk/upload', [
            'files' => [
                UploadedFile::fake()->image('one.jpg', 800, 600),
                UploadedFile::fake()->image('two.png', 1200, 900),
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('message', 'Bulk assets uploaded successfully.')
        ->assertJsonCount(2, 'data');

    expect(Asset::query()->where('project_id', $this->project->id)->count())->toBe(2);
});

test('bulk asset upload is atomic when validation fails', function () {
    $this->withHeaders(bulkAssetHeaders($this->project, $this->token))
        ->post('/api/files/bulk/upload', [
            'files' => [
                UploadedFile::fake()->image('valid.jpg', 800, 600),
                UploadedFile::fake()->create('unsafe.svg', 5, 'image/svg+xml'),
            ],
        ])
        ->assertUnprocessable();

    expect(Asset::query()->where('project_id', $this->project->id)->count())->toBe(0);
});

test('bulk asset metadata update updates multiple assets', function () {
    $firstUpload = $this->withHeaders(bulkAssetHeaders($this->project, $this->token))
        ->post('/api/files', ['file' => UploadedFile::fake()->image('first.jpg', 1000, 700)])
        ->assertCreated();
    $secondUpload = $this->withHeaders(bulkAssetHeaders($this->project, $this->token))
        ->post('/api/files', ['file' => UploadedFile::fake()->image('second.jpg', 1000, 700)])
        ->assertCreated();

    $firstUuid = $firstUpload->json('uuid');
    $secondUuid = $secondUpload->json('uuid');

    $this->withHeaders(bulkAssetHeaders($this->project, $this->token))
        ->patchJson('/api/files/bulk/metadata', [
            'items' => [
                ['uuid' => $firstUuid, 'alt_text' => 'Alt 1', 'title' => 'Title 1'],
                ['uuid' => $secondUuid, 'alt_text' => 'Alt 2', 'author' => 'Elmapi Team'],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Bulk asset metadata updated successfully.')
        ->assertJsonCount(2, 'data');

    $first = Asset::query()->where('uuid', $firstUuid)->with('metadata')->firstOrFail();
    $second = Asset::query()->where('uuid', $secondUuid)->with('metadata')->firstOrFail();

    expect($first->metadata?->alt_text)->toBe('Alt 1');
    expect($first->metadata?->title)->toBe('Title 1');
    expect($second->metadata?->alt_text)->toBe('Alt 2');
    expect($second->metadata?->author)->toBe('Elmapi Team');
});

test('bulk asset metadata update is atomic across project boundaries', function () {
    $localUpload = $this->withHeaders(bulkAssetHeaders($this->project, $this->token))
        ->post('/api/files', ['file' => UploadedFile::fake()->image('local.jpg', 900, 600)])
        ->assertCreated();
    $localUuid = $localUpload->json('uuid');
    $initialAltText = Asset::query()->where('uuid', $localUuid)->with('metadata')->firstOrFail()->metadata?->alt_text;

    $otherProject = Project::factory()->create([
        'disk' => 'public',
        'public_api' => false,
    ]);
    $otherToken = $otherProject->createToken('other-token', ['create', 'read', 'update', 'delete'])->plainTextToken;
    $foreignUpload = $this->withHeaders(bulkAssetHeaders($otherProject, $otherToken))
        ->post('/api/files', ['file' => UploadedFile::fake()->image('foreign.jpg', 900, 600)])
        ->assertCreated();
    $foreignUuid = $foreignUpload->json('uuid');

    $this->withHeaders(bulkAssetHeaders($this->project, $this->token))
        ->patchJson('/api/files/bulk/metadata', [
            'items' => [
                ['uuid' => $localUuid, 'alt_text' => 'Should rollback'],
                ['uuid' => $foreignUuid, 'alt_text' => 'Invalid project asset'],
            ],
        ])
        ->assertUnprocessable();

    $localAsset = Asset::query()->where('uuid', $localUuid)->with('metadata')->firstOrFail();
    expect($localAsset->metadata?->alt_text)->toBe($initialAltText);
});
