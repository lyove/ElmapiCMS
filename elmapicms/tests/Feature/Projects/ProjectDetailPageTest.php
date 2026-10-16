<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function extractProjectDetailPayload(TestResponse $response): array
{
    $content = $response->getContent();
    preg_match('/data-page="([^"]+)"/', $content, $matches);

    expect(isset($matches[1]))->toBeTrue();

    $page = json_decode(
        html_entity_decode($matches[1], ENT_QUOTES),
        true,
        512,
        JSON_THROW_ON_ERROR
    );

    return $page['props']['project'] ?? [];
}

test('guests are redirected from the project detail page', function (): void {
    $project = Project::factory()->create();

    $this->get(route('projects.show', ['project' => $project], absolute: false))
        ->assertRedirect(route('login', absolute: false));
});

test('non members cannot access the project detail page', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();

    $this->actingAs($user)
        ->get(route('projects.show', ['project' => $project], absolute: false))
        ->assertForbidden();
});

test('users with access_all_projects can access project detail page', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();

    Permission::findOrCreate('access_all_projects', 'web');
    $user->givePermissionTo('access_all_projects');

    $this->actingAs($user)
        ->get(route('projects.show', ['project' => $project], absolute: false))
        ->assertOk();
});

test('project detail payload includes members counts and last api usage', function (): void {
    $member = User::factory()->create();
    $otherMember = User::factory()->create();
    $project = Project::factory()->create([
        'name' => 'Detail Project',
        'preview_url' => 'https://preview.example.com',
    ]);
    $project->members()->attach([$member->id, $otherMember->id]);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $project->assets()->create([
        'filename' => 'asset.jpg',
        'original_filename' => 'asset.jpg',
        'mime_type' => 'image/jpeg',
        'extension' => 'jpg',
        'size' => 1024,
        'disk' => 'public',
        'path' => "projects/{$project->uuid}/asset.jpg",
        'created_by' => $member->id,
        'updated_by' => $member->id,
    ]);
    $project->content()->create([
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $member->id,
        'updated_by' => $member->id,
    ]);

    $token = $project->createToken('detail-page-token', ['read'])->accessToken;
    $token->forceFill(['last_used_at' => now()->subMinute()])->save();

    $response = $this->actingAs($member)
        ->get(route('projects.show', ['project' => $project], absolute: false));

    $response->assertOk();

    $payload = extractProjectDetailPayload($response);

    expect($payload['name'])->toBe('Detail Project');
    expect($payload['preview_url'])->toBe('https://preview.example.com');
    expect($payload['collections_count'])->toBe(1);
    expect($payload['assets_count'])->toBe(1);
    expect($payload['content_count'])->toBe(1);
    expect($payload['members'])->toHaveCount(2);
    expect($payload['last_api_usage'])->not->toBeNull();
});
