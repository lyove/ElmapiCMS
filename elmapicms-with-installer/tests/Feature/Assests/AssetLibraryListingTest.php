<?php

use App\Models\Asset;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function assetListingPayload(TestResponse $response): array
{
    preg_match('/data-page="([^"]+)"/', $response->getContent(), $matches);

    expect(isset($matches[1]))->toBeTrue();

    return json_decode(
        html_entity_decode($matches[1], ENT_QUOTES),
        true,
        512,
        JSON_THROW_ON_ERROR
    );
}

function createAssetMemberWithPermission(string ...$permissions): array
{
    $user = User::factory()->create();
    $project = Project::factory()->create(['disk' => 'public']);
    $project->members()->attach($user->id);

    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    if ($permissions !== []) {
        $user->givePermissionTo($permissions);
    }

    return [$user, $project];
}

function createProjectAsset(Project $project, array $overrides = []): Asset
{
    static $counter = 1;
    $index = $counter++;

    return Asset::create(array_merge([
        'project_id' => $project->id,
        'filename' => "asset-{$index}.webp",
        'original_filename' => "asset-{$index}.jpg",
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 1000 + $index,
        'disk' => 'public',
        'path' => "projects/{$project->uuid}/assets/asset-{$index}.webp",
        'created_by' => null,
        'updated_by' => null,
        'created_at' => now()->subHours($index),
        'updated_at' => now()->subHours($index),
    ], $overrides));
}

test('asset library requires authentication', function () {
    $project = Project::factory()->create();

    $this->get(route('assets.index', [$project->id], absolute: false))
        ->assertRedirect(route('login', absolute: false));
});

test('asset library requires access assets permission', function () {
    [$user, $project] = createAssetMemberWithPermission();

    $this->actingAs($user)
        ->get(route('assets.index', [$project->id], absolute: false))
        ->assertForbidden();
});

test('non members cannot access asset library even with permission', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['disk' => 'public']);

    Permission::findOrCreate('access_assets', 'web');
    $user->givePermissionTo('access_assets');

    $this->actingAs($user)
        ->get(route('assets.index', [$project->id], absolute: false))
        ->assertForbidden();
});

test('asset library lists only current project assets with pagination', function () {
    [$user, $project] = createAssetMemberWithPermission('access_assets');
    $otherProject = Project::factory()->create(['disk' => 'public']);

    foreach (range(1, 13) as $i) {
        createProjectAsset($project, [
            'filename' => "project-a-{$i}.webp",
            'original_filename' => "project-a-{$i}.jpg",
            'path' => "projects/{$project->uuid}/assets/project-a-{$i}.webp",
        ]);
    }

    foreach (range(1, 4) as $i) {
        createProjectAsset($otherProject, [
            'filename' => "project-b-{$i}.webp",
            'original_filename' => "project-b-{$i}.jpg",
            'path' => "projects/{$otherProject->uuid}/assets/project-b-{$i}.webp",
        ]);
    }

    $response = $this->actingAs($user)
        ->get(route('assets.index', [$project->id], absolute: false).'?per_page=10&page=1');

    $response->assertOk();
    $payload = assetListingPayload($response);
    $assets = $payload['props']['assets'];

    expect($assets['total'])->toBe(13);
    expect($assets['per_page'])->toBe(10);
    expect($assets['data'])->toHaveCount(10);
    expect(collect($assets['data'])->pluck('path')->every(fn (string $path) => str_contains($path, "/{$project->uuid}/")))->toBeTrue();
});

test('asset library applies search type and sort filters', function () {
    [$user, $project] = createAssetMemberWithPermission('access_assets');

    createProjectAsset($project, [
        'filename' => 'hero-image.webp',
        'original_filename' => 'hero-image.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 4000,
    ]);
    createProjectAsset($project, [
        'filename' => 'audio-track.mp3',
        'original_filename' => 'audio-track.mp3',
        'mime_type' => 'audio/mpeg',
        'extension' => 'mp3',
        'size' => 1200,
        'path' => "projects/{$project->uuid}/assets/audio-track.mp3",
    ]);
    createProjectAsset($project, [
        'filename' => 'another-image.webp',
        'original_filename' => 'another-image.jpg',
        'mime_type' => 'image/webp',
        'extension' => 'webp',
        'size' => 800,
    ]);

    $response = $this->actingAs($user)->get(
        route('assets.index', [$project->id], absolute: false).'?search=image&type=image&sort=size_desc&per_page=25'
    );

    $response->assertOk();
    $payload = assetListingPayload($response);
    $data = $payload['props']['assets']['data'];

    expect($data)->toHaveCount(2);
    expect($data[0]['size'])->toBeGreaterThanOrEqual($data[1]['size']);
    expect(collect($data)->pluck('extension')->unique()->all())->toBe(['webp']);
});

test('asset library invalid per page falls back to default', function () {
    [$user, $project] = createAssetMemberWithPermission('access_assets');

    foreach (range(1, 12) as $i) {
        createProjectAsset($project, [
            'filename' => "fallback-{$i}.webp",
            'original_filename' => "fallback-{$i}.jpg",
        ]);
    }

    $response = $this->actingAs($user)
        ->get(route('assets.index', [$project->id], absolute: false).'?per_page=17');

    $response->assertOk();
    $payload = assetListingPayload($response);

    expect($payload['props']['assets']['per_page'])->toBe(10);
    expect($payload['props']['assets']['data'])->toHaveCount(10);
});

test('asset library applies week date filter and ignores unknown filters', function () {
    [$user, $project] = createAssetMemberWithPermission('access_assets');

    $recentAsset = createProjectAsset($project, [
        'filename' => 'recent.webp',
        'original_filename' => 'recent.jpg',
    ]);
    $recentAsset->forceFill([
        'created_at' => now()->subDays(3),
        'updated_at' => now()->subDays(3),
    ])->save();

    $oldAsset = createProjectAsset($project, [
        'filename' => 'old.webp',
        'original_filename' => 'old.jpg',
    ]);
    $oldAsset->forceFill([
        'created_at' => now()->subDays(20),
        'updated_at' => now()->subDays(20),
    ])->save();

    $response = $this->actingAs($user)->get(
        route('assets.index', [$project->id], absolute: false).'?date_filter=week&type=unknown&sort=unknown'
    );

    $response->assertOk();
    $payload = assetListingPayload($response);
    $data = $payload['props']['assets']['data'];

    expect($data)->toHaveCount(1);
    expect($data[0]['filename'])->toBe('recent.webp');
});
