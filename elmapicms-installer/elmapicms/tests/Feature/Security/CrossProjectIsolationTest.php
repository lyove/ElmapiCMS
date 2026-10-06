<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantIsolationPermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('collection show blocks access when collection belongs to another project', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign Collection',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->get(route('projects.collections.show', ['project' => $projectA, 'collection' => $foreignCollection], absolute: false))
        ->assertNotFound();
});

test('collection update and delete block cross project access', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);

    grantIsolationPermission($user, 'update_collection');
    grantIsolationPermission($user, 'delete_collection');

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign Collection',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->put(route('projects.collections.update', ['project' => $projectA, 'collection' => $foreignCollection], absolute: false), [
            'name' => 'Attempted Update',
            'slug' => 'attempted-update',
        ])
        ->assertNotFound();

    $this->actingAs($user)
        ->delete(route('projects.collections.destroy', ['project' => $projectA, 'collection' => $foreignCollection], absolute: false), [
            'slug' => 'foreign',
        ])
        ->assertNotFound();
});

test('save collection as template blocks cross project collection usage', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);

    grantIsolationPermission($user, 'access_collection_settings');

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign Collection',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->post(route('collections.saveAsTemplate', ['project' => $projectA, 'collection' => $foreignCollection], absolute: false), [
            'name' => 'Foreign Template',
        ])
        ->assertNotFound();
});

test('export collection endpoint blocks cross project collection usage', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);

    grantIsolationPermission($user, 'access_project_settings');

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign Collection',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->post(route('projects.settings.export-import.export-collection', [
            'project' => $projectA,
            'collection' => $foreignCollection,
        ], absolute: false), [
            'include_content' => false,
        ])
        ->assertNotFound();
});
