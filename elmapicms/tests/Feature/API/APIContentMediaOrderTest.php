<?php

use App\Models\Asset;
use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\ContentMediaRelation;
use App\Models\Field;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    config(['filesystems.default' => 'public']);

    $this->project = Project::factory()->create([
        'disk' => 'public',
        'public_api' => false,
    ]);

    $this->token = $this->project
        ->createToken('content-token', ['create', 'read', 'update', 'delete'])
        ->plainTextToken;
    $this->apiHeaders = fn () => [
        'project-id' => $this->project->uuid,
        'Authorization' => "Bearer {$this->token}",
        'Accept' => 'application/json',
    ];
});

test('content api stores and returns media in submitted order', function () {
    $collection = Collection::create([
        'project_id' => $this->project->id,
        'name' => 'Posts',
        'slug' => 'posts',
    ]);

    Field::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'type' => 'media',
        'label' => 'Gallery',
        'name' => 'gallery',
        'options' => [
            'multiple' => true,
            'media' => ['type' => 2],
        ],
    ]);

    $assetA = Asset::create([
        'project_id' => $this->project->id,
        'filename' => 'a.webp',
        'original_filename' => 'a.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 100,
        'disk' => 'public',
        'path' => "projects/{$this->project->uuid}/assets/a.webp",
    ]);
    $assetB = Asset::create([
        'project_id' => $this->project->id,
        'filename' => 'b.webp',
        'original_filename' => 'b.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 100,
        'disk' => 'public',
        'path' => "projects/{$this->project->uuid}/assets/b.webp",
    ]);
    $assetC = Asset::create([
        'project_id' => $this->project->id,
        'filename' => 'c.webp',
        'original_filename' => 'c.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 100,
        'disk' => 'public',
        'path' => "projects/{$this->project->uuid}/assets/c.webp",
    ]);

    $submittedOrder = [$assetC->id, $assetA->id, $assetB->id];
    $submittedUuidOrder = collect($submittedOrder)
        ->map(fn (int $assetId) => Asset::query()->findOrFail($assetId)->uuid)
        ->all();

    $storeResponse = $this->withHeaders(($this->apiHeaders)())
        ->postJson("/api/{$collection->slug}", [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'gallery' => $submittedOrder,
            ],
        ])
        ->assertCreated();

    $entryUuid = $storeResponse->json('data.uuid') ?? $storeResponse->json('uuid');
    expect($entryUuid)->not->toBeNull();

    $entry = ContentEntry::query()->where('uuid', $entryUuid)->firstOrFail();
    $fieldValue = ContentFieldValue::query()
        ->where('content_entry_id', $entry->id)
        ->where('field_type', 'media')
        ->firstOrFail();

    $persistedOrder = ContentMediaRelation::query()
        ->where('field_value_id', $fieldValue->id)
        ->orderBy('sort_order')
        ->pluck('asset_id')
        ->all();

    expect($persistedOrder)->toBe($submittedOrder);

    $showResponse = $this->withHeaders(($this->apiHeaders)())
        ->getJson("/api/{$collection->slug}/{$entryUuid}?state=published")
        ->assertOk();

    $apiOrder = collect($showResponse->json('data.fields.gallery') ?? $showResponse->json('fields.gallery'))
        ->pluck('uuid')
        ->all();

    expect($apiOrder)->toBe($submittedUuidOrder);
});
