<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function grantIndexPermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('users api index supports search by name or email', function (): void {
    $actingUser = User::factory()->create();
    $matchingUser = User::factory()->create([
        'name' => 'Alice Searchable',
        'email' => 'alice.searchable@example.com',
    ]);
    $nonMatchingUser = User::factory()->create([
        'name' => 'Bob Hidden',
        'email' => 'bob.hidden@example.com',
    ]);

    grantIndexPermission($actingUser, 'access_users');

    $response = $this->actingAs($actingUser)->get('/user-management/api/users?search=alice');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id')->all();

    expect($ids)->toContain($matchingUser->id)
        ->not->toContain($nonMatchingUser->id);
});

test('users api index supports filtering by role id', function (): void {
    $actingUser = User::factory()->create();
    $roleA = Role::create(['name' => 'Role A']);
    $roleB = Role::create(['name' => 'Role B']);

    $roleAUser = User::factory()->create(['email' => 'role-a@example.com']);
    $roleBUser = User::factory()->create(['email' => 'role-b@example.com']);
    $roleAUser->assignRole($roleA);
    $roleBUser->assignRole($roleB);

    grantIndexPermission($actingUser, 'access_users');

    $response = $this->actingAs($actingUser)->get("/user-management/api/users?filter_roles={$roleA->id}");

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id')->all();

    expect($ids)->toContain($roleAUser->id)
        ->not->toContain($roleBUser->id);
});

test('users api index honors per_page pagination parameter', function (): void {
    $actingUser = User::factory()->create();
    User::factory()->count(5)->create();

    grantIndexPermission($actingUser, 'access_users');

    $response = $this->actingAs($actingUser)->get('/user-management/api/users?per_page=2');

    $response->assertOk();
    expect($response->json('per_page'))->toBe(2);
    expect($response->json('data'))->toHaveCount(2);
});

test('roles api index supports search', function (): void {
    $actingUser = User::factory()->create();
    $matchingRole = Role::create(['name' => 'Content Reviewer']);
    $nonMatchingRole = Role::create(['name' => 'Infrastructure']);

    grantIndexPermission($actingUser, 'access_roles');

    $response = $this->actingAs($actingUser)->get('/user-management/api/roles?search=reviewer');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id')->all();

    expect($ids)->toContain($matchingRole->id)
        ->not->toContain($nonMatchingRole->id);
});

test('roles api index supports sorting', function (): void {
    $actingUser = User::factory()->create();
    Role::create(['name' => 'Alpha']);
    Role::create(['name' => 'Zulu']);

    grantIndexPermission($actingUser, 'access_roles');

    $response = $this->actingAs($actingUser)->get('/user-management/api/roles?sort=name&direction=desc');

    $response->assertOk();
    $names = collect($response->json('data'))->pluck('name')->values();

    expect($names->first())->toBe('Zulu');
});

test('permissions api index supports search and pagination', function (): void {
    $actingUser = User::factory()->create();
    Permission::create(['name' => 'manage_content']);
    Permission::create(['name' => 'delete_everything']);
    Permission::create(['name' => 'manage_assets']);

    grantIndexPermission($actingUser, 'access_permissions');

    $response = $this->actingAs($actingUser)->get('/user-management/api/permissions?search=manage&per_page=1');

    $response->assertOk();
    expect($response->json('per_page'))->toBe(1);
    expect($response->json('data'))->toHaveCount(1);
    expect(collect($response->json('data'))->pluck('name')->first())->toContain('manage');
});
