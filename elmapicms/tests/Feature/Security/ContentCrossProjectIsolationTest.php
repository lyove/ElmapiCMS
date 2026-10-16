<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantContentIsolationPermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('content create page blocks foreign collection under current project route', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);

    grantContentIsolationPermission($user, 'create_content');

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->get(route('projects.collections.content.create', [
            'project' => $projectA,
            'collection' => $foreignCollection,
        ], absolute: false))
        ->assertNotFound();
});

test('content store blocks foreign collection under current project route', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);

    grantContentIsolationPermission($user, 'create_content');

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $foreignCollection->allFields()->create([
        'project_id' => $projectB->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.store', [
        'project' => $projectA,
        'collection' => $foreignCollection,
    ], absolute: false), [
        'state' => 'draft',
        'locale' => 'en',
        'data' => [
            'title' => 'cross-project-attempt',
        ],
    ]);

    $response->assertNotFound();
    expect($foreignCollection->contentEntries()->count())->toBe(0);
});

test('content search and relation collection endpoints block foreign collection usage', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->get(route('projects.collections.content.search', [
            'project' => $projectA,
            'collection' => $foreignCollection,
        ], absolute: false))
        ->assertNotFound();

    $this->actingAs($user)
        ->get(route('projects.collections.content.getRelationCollection', [
            'project' => $projectA,
            'collection' => $foreignCollection,
        ], absolute: false))
        ->assertNotFound();
});
