<?php

use App\Http\Middleware\EnsureProjectMember;
use App\Models\Asset;
use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\ContentMediaRelation;
use App\Models\Field;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Middleware\PermissionMiddleware;

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
        'Accept' => 'application/json',
    ];
});

test('api files endpoint is always paginated and bounded', function () {
    foreach (range(1, 3) as $index) {
        $this->withHeaders(($this->apiHeaders)())
            ->post('/api/files', [
                'file' => UploadedFile::fake()->image("asset-{$index}.jpg", 800, 600),
            ])
            ->assertCreated();
    }

    $response = $this->withHeaders(($this->apiHeaders)())
        ->get('/api/files?paginate=10000');

    $response->assertOk()
        ->assertJsonStructure([
            'data',
            'links',
            'meta',
        ]);
});

test('api upload rejects unsupported file types', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->create('script.php', 5, 'text/x-php'),
        ])
        ->assertUnprocessable();
});

test('uploads stream blocks non-asset public paths', function () {
    Storage::disk('public')->put('misc/secret.txt', 'secret');

    $this->get('/uploads/misc/secret.txt')->assertNotFound();
});

test('uploads stream serves existing asset paths', function () {
    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('streamable.jpg', 1000, 700),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail();

    $this->get('/uploads/'.$asset->path)->assertOk();
});

test('crop endpoint rejects asset from different project', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $otherProject = Project::factory()->create(['disk' => 'public']);
    $asset = Asset::create([
        'project_id' => $otherProject->id,
        'filename' => 'mismatch.webp',
        'original_filename' => 'mismatch.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 1200,
        'disk' => 'public',
        'path' => "projects/{$otherProject->uuid}/assets/mismatch.webp",
        'created_by' => null,
        'updated_by' => null,
    ]);

    Storage::disk('public')->put($asset->path, 'content');

    $this->actingAs(User::factory()->create())->put(route('assets.crop', [$this->project->id, $asset->id]), [
        'file' => UploadedFile::fake()->image('new.jpg', 400, 300),
    ])->assertNotFound();
});

test('crop replacement updates metadata and preserves original file strategy', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('initial.jpg', 1000, 700),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail()->load('metadata');
    $previousPath = $asset->path;
    $previousOriginalPath = $asset->original_path;
    $previousThumbnailPath = $asset->getThumbnailPath();

    $response = $this->actingAs(User::factory()->create())
        ->put(route('assets.crop', [$this->project->id, $asset->id]), [
            'file' => UploadedFile::fake()->image('edited.jpg', 420, 280),
        ]);

    $response->assertOk();

    $asset->refresh()->load('metadata');

    expect($asset->path)->not->toBe($previousPath)
        ->and($asset->original_path)->not->toBeNull()
        ->and($asset->original_path)->not->toBe($previousOriginalPath)
        ->and($asset->metadata?->width)->toBe(420)
        ->and($asset->metadata?->height)->toBe(280);

    Storage::disk('public')->assertExists($asset->path);
    Storage::disk('public')->assertExists($asset->original_path);
    Storage::disk('public')->assertExists($asset->getThumbnailPath());
    Storage::disk('public')->assertMissing($previousPath);
    Storage::disk('public')->assertMissing($previousOriginalPath);
    Storage::disk('public')->assertMissing($previousThumbnailPath);
});

test('asset api show includes usage summary for related content entries', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $user = User::factory()->create();
    $collection = Collection::create([
        'project_id' => $this->project->id,
        'name' => 'Posts',
        'slug' => 'posts',
        'order' => 1,
    ]);
    $field = Field::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'type' => 'media',
        'label' => 'Cover',
        'name' => 'cover',
        'order' => 1,
    ]);
    $entry = ContentEntry::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    $value = ContentFieldValue::create([
        'project_id' => $this->project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $field->id,
        'field_type' => 'media',
    ]);

    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('used.jpg', 900, 600),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail();
    ContentMediaRelation::create([
        'field_value_id' => $value->id,
        'asset_id' => $asset->id,
        'sort_order' => 0,
    ]);

    $this->actingAs($user)
        ->get(route('assets.api.show', [$this->project->id, $asset->id]))
        ->assertOk()
        ->assertJsonPath('usage_summary.total_relations', 1)
        ->assertJsonPath('usage_summary.total_entries', 1)
        ->assertJsonPath('usage_summary.entries.0.collection_name', 'Posts')
        ->assertJsonPath('usage_summary.entries.0.field_name', 'cover')
        ->assertJsonPath('usage_summary.entries.0.entry_id', $entry->id);
});

test('asset picker api orders selected ids first', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $user = User::factory()->create();

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

    $response = $this->actingAs($user)
        ->get(route('assets.api.index', [$this->project->id]).'?selected_ids='.$assetC->id.','.$assetA->id.'&per_page=25')
        ->assertOk();

    expect($response->json('data.0.id'))->toBe($assetC->id)
        ->and($response->json('data.1.id'))->toBe($assetA->id)
        ->and(collect($response->json('data'))->pluck('id')->all())->toContain($assetB->id);
});

test('asset picker api accepts web style sort aliases', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $user = User::factory()->create();

    $alpha = Asset::create([
        'project_id' => $this->project->id,
        'filename' => 'alpha.webp',
        'original_filename' => 'alpha.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 300,
        'disk' => 'public',
        'path' => "projects/{$this->project->uuid}/assets/alpha.webp",
    ]);
    $zeta = Asset::create([
        'project_id' => $this->project->id,
        'filename' => 'zeta.webp',
        'original_filename' => 'zeta.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 100,
        'disk' => 'public',
        'path' => "projects/{$this->project->uuid}/assets/zeta.webp",
    ]);

    $byNameDesc = $this->actingAs($user)
        ->get(route('assets.api.index', [$this->project->id]).'?sort=name_desc&per_page=25')
        ->assertOk();

    expect($byNameDesc->json('data.0.id'))->toBe($zeta->id)
        ->and($byNameDesc->json('data.1.id'))->toBe($alpha->id);

    $bySizeAsc = $this->actingAs($user)
        ->get(route('assets.api.index', [$this->project->id]).'?sort=size_asc&per_page=25')
        ->assertOk();

    expect($bySizeAsc->json('data.0.id'))->toBe($zeta->id)
        ->and($bySizeAsc->json('data.1.id'))->toBe($alpha->id);
});

test('asset library web api update stores metadata fields', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $user = User::factory()->create();

    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('meta-target.jpg', 1100, 700),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail();

    $response = $this->actingAs($user)->putJson(route('assets.api.update', [$this->project->id, $asset->id]), [
        'alt_text' => 'Hero visual',
        'title' => 'Homepage Hero',
        'caption' => 'Caption text',
        'description' => 'Descriptive copy',
        'author' => 'Elmapi',
        'copyright' => 'ACME',
    ]);

    $response->assertOk()
        ->assertJsonPath('metadata.alt_text', 'Hero visual')
        ->assertJsonPath('metadata.title', 'Homepage Hero')
        ->assertJsonPath('metadata.author', 'Elmapi');

    $this->assertDatabaseHas('asset_metadata', [
        'asset_id' => $asset->id,
        'alt_text' => 'Hero visual',
        'title' => 'Homepage Hero',
        'author' => 'Elmapi',
    ]);
});

test('asset library web api update rejects assets from other projects', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $otherProject = Project::factory()->create(['disk' => 'public']);
    $asset = Asset::create([
        'project_id' => $otherProject->id,
        'filename' => 'foreign.webp',
        'original_filename' => 'foreign.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 500,
        'disk' => 'public',
        'path' => "projects/{$otherProject->uuid}/assets/foreign.webp",
    ]);

    $this->actingAs(User::factory()->create())
        ->putJson(route('assets.api.update', [$this->project->id, $asset->id]), [
            'title' => 'Should fail',
        ])
        ->assertNotFound();
});

test('asset library web api destroy removes file and soft deletes row', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $this->withHeaders(($this->apiHeaders)())
        ->post('/api/files', [
            'file' => UploadedFile::fake()->image('delete-me.jpg', 1000, 650),
        ])
        ->assertCreated();

    $asset = Asset::query()->firstOrFail();
    $mainPath = $asset->path;
    $thumbnailPath = $asset->getThumbnailPath();
    $originalPath = $asset->original_path;

    $this->actingAs(User::factory()->create())
        ->deleteJson(route('assets.api.destroy', [$this->project->id, $asset->id]))
        ->assertOk()
        ->assertJsonPath('success', true);

    Storage::disk('public')->assertMissing($mainPath);
    Storage::disk('public')->assertMissing($thumbnailPath);
    Storage::disk('public')->assertMissing($originalPath);
    $this->assertSoftDeleted('assets', ['id' => $asset->id]);
});

test('asset library bulk delete only removes assets in the current project', function () {
    $this->withoutMiddleware([
        EnsureProjectMember::class,
        PermissionMiddleware::class,
    ]);

    $user = User::factory()->create();
    $otherProject = Project::factory()->create(['disk' => 'public']);

    $assetInProject = Asset::create([
        'project_id' => $this->project->id,
        'filename' => 'local.webp',
        'original_filename' => 'local.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 200,
        'disk' => 'public',
        'path' => "projects/{$this->project->uuid}/assets/local.webp",
    ]);

    $assetInOtherProject = Asset::create([
        'project_id' => $otherProject->id,
        'filename' => 'foreign.webp',
        'original_filename' => 'foreign.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 300,
        'disk' => 'public',
        'path' => "projects/{$otherProject->uuid}/assets/foreign.webp",
    ]);

    Storage::disk('public')->put($assetInProject->path, 'local');
    Storage::disk('public')->put($assetInOtherProject->path, 'foreign');

    $this->actingAs($user)->postJson(route('assets.bulk-destroy', [$this->project->id]), [
        'asset_ids' => [$assetInProject->id, $assetInOtherProject->id],
    ])
        ->assertOk()
        ->assertJsonPath('success', true);

    $this->assertSoftDeleted('assets', ['id' => $assetInProject->id]);
    $this->assertDatabaseHas('assets', ['id' => $assetInOtherProject->id, 'deleted_at' => null]);
    Storage::disk('public')->assertMissing($assetInProject->path);
    Storage::disk('public')->assertExists($assetInOtherProject->path);
});
