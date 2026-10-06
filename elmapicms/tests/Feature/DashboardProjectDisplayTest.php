<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function extractDashboardProjects(TestResponse $response): array
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

    return $page['props']['projects'] ?? [];
}

test('dashboard shows only projects where the user is a member', function (): void {
    $user = User::factory()->create();

    $memberProject = Project::factory()->create(['name' => 'Member Project']);
    $otherProject = Project::factory()->create(['name' => 'Other Project']);

    $memberProject->members()->attach($user->id);

    $response = $this->actingAs($user)->get(route('dashboard', absolute: false));
    $response->assertOk();

    $projectNames = array_column(extractDashboardProjects($response), 'name');

    expect($projectNames)->toContain('Member Project')
        ->not->toContain('Other Project');
});

test('dashboard shows all projects for users with access_all_projects permission', function (): void {
    $user = User::factory()->create();

    Permission::findOrCreate('access_all_projects', 'web');
    $user->givePermissionTo('access_all_projects');

    Project::factory()->create(['name' => 'Alpha Project']);
    Project::factory()->create(['name' => 'Beta Project']);

    $response = $this->actingAs($user)->get(route('dashboard', absolute: false));
    $response->assertOk();

    $projectNames = array_column(extractDashboardProjects($response), 'name');

    expect($projectNames)->toContain('Alpha Project')
        ->toContain('Beta Project');
});

test('dashboard projects are sent in newest-first order', function (): void {
    $user = User::factory()->create();

    $olderProject = Project::factory()->create([
        'name' => 'Older Project',
        'created_at' => now()->subDays(2),
    ]);
    $newerProject = Project::factory()->create([
        'name' => 'Newer Project',
        'created_at' => now(),
    ]);

    $olderProject->members()->attach($user->id);
    $newerProject->members()->attach($user->id);

    $response = $this->actingAs($user)->get(route('dashboard', absolute: false));
    $response->assertOk();

    $projectNames = array_column(extractDashboardProjects($response), 'name');

    expect($projectNames[0])->toBe('Newer Project');
    expect($projectNames[1])->toBe('Older Project');
});

test('dashboard project payload includes fields used by client-side search and sorting', function (): void {
    $user = User::factory()->create();

    $project = Project::factory()->create([
        'name' => 'Searchable Project',
        'description' => 'Dashboard search and sort contract',
    ]);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)->get(route('dashboard', absolute: false));
    $response->assertOk();

    $projects = extractDashboardProjects($response);
    $payloadProject = collect($projects)->firstWhere('name', 'Searchable Project');

    expect($payloadProject)->not->toBeNull();
    expect($payloadProject)->toHaveKeys([
        'name',
        'description',
        'updated_at',
        'collections_count',
        'assets_count',
        'content_count',
    ]);
});

test('dashboard page renders so client can restore persisted view and sort preferences', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['name' => 'Preference Project']);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)->get(route('dashboard', absolute: false));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('projects', 1)
        ->where('projects.0.name', 'Preference Project'));
});
