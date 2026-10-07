<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantSettingsPermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

dataset('project settings pages', [
    'general settings' => ['projects.settings.project', 'access_project_settings'],
    'localization settings' => ['projects.settings.localization', 'access_localization_settings'],
    'user access settings' => ['projects.settings.user-access', 'access_user_access_settings'],
    'api access settings' => ['projects.settings.api-access', 'access_api_access_settings'],
    'auth settings' => ['projects.settings.auth.index', 'access_auth_settings'],
    'webhooks settings' => ['projects.settings.webhooks', 'access_webhooks_settings'],
    'export import settings' => ['projects.settings.export-import', 'access_project_settings'],
]);

test('guests are redirected from project settings pages', function (string $routeName, string $permission): void {
    $project = Project::factory()->create();

    $this->get(route($routeName, ['project' => $project], absolute: false))
        ->assertRedirect(route('login', absolute: false));
})->with('project settings pages');

test('non members cannot access project settings pages', function (string $routeName, string $permission): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    grantSettingsPermission($user, $permission);

    $this->actingAs($user)
        ->get(route($routeName, ['project' => $project], absolute: false))
        ->assertForbidden();
})->with('project settings pages');

test('members without the required permission cannot access project settings pages', function (string $routeName, string $permission): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    Permission::findOrCreate($permission, 'web');

    $this->actingAs($user)
        ->get(route($routeName, ['project' => $project], absolute: false))
        ->assertForbidden();
})->with('project settings pages');

test('members with required permission can access project settings pages', function (string $routeName, string $permission): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantSettingsPermission($user, $permission);

    $this->actingAs($user)
        ->get(route($routeName, ['project' => $project], absolute: false))
        ->assertOk();
})->with('project settings pages');
