<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

dataset('user management pages', [
    'users' => ['user-management.users.index', 'access_users'],
    'roles' => ['user-management.roles.index', 'access_roles'],
    'permissions' => ['user-management.permissions.index', 'access_permissions'],
]);

test('guests are redirected when visiting user management pages', function (string $routeName, string $permission): void {
    $response = $this->get(route($routeName, absolute: false));

    $response->assertRedirect(route('login', absolute: false));
})->with('user management pages');

test('authenticated users without permission cannot visit user management pages', function (string $routeName, string $permission): void {
    $user = User::factory()->create();

    Permission::findOrCreate($permission, 'web');

    $response = $this->actingAs($user)->get(route($routeName, absolute: false));

    $response->assertForbidden();
})->with('user management pages');

test('authenticated users with permission can visit user management pages', function (string $routeName, string $permission): void {
    $user = User::factory()->create();

    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);

    $response = $this->actingAs($user)->get(route($routeName, absolute: false));

    $response->assertOk();
})->with('user management pages');
