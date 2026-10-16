<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\Feature\API\APIProjectTest;

uses(RefreshDatabase::class);

function grantProjectPermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

function validProjectPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Roadmap Project',
        'default_locale' => 'en',
        'description' => 'Project created from test',
    ], $overrides);
}

test('guests are redirected when creating a project', function (): void {
    $response = $this->post(route('projects.store', absolute: false), validProjectPayload());

    $response->assertRedirect(route('login', absolute: false));
    expect(Project::count())->toBe(0);
});

test('authenticated users without create_project permission cannot create a project', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('projects.store', absolute: false), validProjectPayload());

    $response->assertForbidden();
    expect(Project::count())->toBe(0);
});

test('authorized users can create a project and are attached as members', function (): void {
    $user = User::factory()->create();
    grantProjectPermission($user, 'create_project');

    $response = $this->actingAs($user)->post(route('projects.store', absolute: false), validProjectPayload());

    $project = Project::query()->latest('id')->firstOrFail();

    $response->assertRedirect(route('projects.show', ['project' => $project], absolute: false));
    $this->assertDatabaseHas('projects', [
        'id' => $project->id,
        'name' => 'Roadmap Project',
        'default_locale' => 'en',
        'disk' => 'public',
        'public_api' => false,
    ]);
    $this->assertDatabaseHas('project_user', [
        'project_id' => $project->id,
        'user_id' => $user->id,
    ]);
});

test('users with access_all_projects are not auto-attached as project members', function (): void {
    $user = User::factory()->create();
    grantProjectPermission($user, 'create_project');
    grantProjectPermission($user, 'access_all_projects');

    $response = $this->actingAs($user)->post(route('projects.store', absolute: false), validProjectPayload([
        'name' => 'Global Access Project',
    ]));

    $project = Project::query()->latest('id')->firstOrFail();

    $response->assertRedirect(route('projects.show', ['project' => $project], absolute: false));
    $this->assertDatabaseMissing('project_user', [
        'project_id' => $project->id,
        'user_id' => $user->id,
    ]);
});

test('project creation validates required fields and invalid project names', function (): void {
    $user = User::factory()->create();
    grantProjectPermission($user, 'create_project');

    $response = $this->actingAs($user)->post(route('projects.store', absolute: false), validProjectPayload([
        'name' => 'Invalid # Project',
        'default_locale' => '',
    ]));

    $response->assertInvalid(['name', 'default_locale']);
    expect(Project::count())->toBe(0);
});

test('project creation with template applies template settings and creates structure', function (): void {
    $user = User::factory()->create();
    grantProjectPermission($user, 'create_project');
    APIProjectTest::seedTestProjectTemplate('blog-next-js');

    $response = $this->actingAs($user)->post(route('projects.store', absolute: false), validProjectPayload([
        'name' => 'Template Based Project',
        'default_locale' => 'fr',
        'template_slug' => 'blog-next-js',
        'with_demo_data' => false,
    ]));

    $project = Project::query()->latest('id')->firstOrFail();

    $response->assertRedirect(route('projects.show', ['project' => $project], absolute: false));

    // The template values should override form locale settings.
    expect($project->default_locale)->toBe('en');
    expect($project->locales)->toBe(['en']);
    expect($project->public_api)->toBeFalse();

    $this->assertDatabaseHas('collections', [
        'project_id' => $project->id,
        'slug' => 'about',
    ]);

    $aboutCollectionId = $project->collections()->where('slug', 'about')->value('id');
    $this->assertDatabaseHas('collection_fields', [
        'project_id' => $project->id,
        'collection_id' => $aboutCollectionId,
        'name' => 'name',
    ]);
});

test('project creation with template does not seed demo content when disabled', function (): void {
    $user = User::factory()->create();
    grantProjectPermission($user, 'create_project');
    APIProjectTest::seedTestProjectTemplate('blog-next-js');

    $this->actingAs($user)->post(route('projects.store', absolute: false), validProjectPayload([
        'name' => 'Template No Demo Project',
        'template_slug' => 'blog-next-js',
        'with_demo_data' => false,
    ]));

    $project = Project::query()->latest('id')->firstOrFail();

    expect($project->content()->count())->toBe(0);
});

test('project creation with template can seed demo content when enabled', function (): void {
    $user = User::factory()->create();
    grantProjectPermission($user, 'create_project');
    APIProjectTest::seedTestProjectTemplate('blog-next-js');

    $this->actingAs($user)->post(route('projects.store', absolute: false), validProjectPayload([
        'name' => 'Template Demo Project',
        'template_slug' => 'blog-next-js',
        'with_demo_data' => true,
    ]));

    $project = Project::query()->latest('id')->firstOrFail();

    expect($project->content()->count())->toBeGreaterThan(0);
});

test('project creation falls back to form locale when template slug does not exist', function (): void {
    $user = User::factory()->create();
    grantProjectPermission($user, 'create_project');

    $response = $this->actingAs($user)->post(route('projects.store', absolute: false), validProjectPayload([
        'name' => 'Unknown Template Project',
        'default_locale' => 'tr',
        'template_slug' => 'does-not-exist',
        'with_demo_data' => true,
    ]));

    $project = Project::query()->latest('id')->firstOrFail();

    $response->assertRedirect(route('projects.show', ['project' => $project], absolute: false));
    expect($project->default_locale)->toBe('tr');
    expect($project->locales)->toBe(['tr']);
    expect($project->public_api)->toBeFalse();
    expect($project->collections()->count())->toBe(0);
});
