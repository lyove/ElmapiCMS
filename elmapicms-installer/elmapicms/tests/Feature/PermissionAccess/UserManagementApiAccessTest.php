<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function performApiRequest(
    TestCase $testCase,
    string $method,
    string $uri,
    array $payload = []
): TestResponse {
    return match (strtoupper($method)) {
        'GET' => $testCase->get($uri, $payload),
        'POST' => $testCase->post($uri, $payload),
        'PUT' => $testCase->put($uri, $payload),
        'DELETE' => $testCase->delete($uri, $payload),
        default => throw new InvalidArgumentException("Unsupported method [{$method}]"),
    };
}

function userManagementApiFixtures(): array
{
    $actingUser = User::factory()->create([
        'password' => bcrypt('password'),
    ]);
    $targetUser = User::factory()->create();
    $baseRole = Role::create(['name' => 'Member']);
    $targetRole = Role::create(['name' => 'Editor']);
    $targetPermission = Permission::create(['name' => 'custom_permission']);

    return [
        'actingUser' => $actingUser,
        'targetUser' => $targetUser,
        'baseRole' => $baseRole,
        'targetRole' => $targetRole,
        'targetPermission' => $targetPermission,
    ];
}

dataset('user management api endpoints', function (): array {
    return [
        'users index' => [
            'GET',
            fn (array $fx): string => '/user-management/api/users',
            'access_users',
            fn (array $fx): array => [],
        ],
        'users store' => [
            'POST',
            fn (array $fx): string => '/user-management/api/users',
            'create_users',
            fn (array $fx): array => [
                'name' => 'New User',
                'email' => 'new-user@example.com',
                'password' => 'password123',
                'roles' => [$fx['baseRole']->id],
            ],
        ],
        'users update' => [
            'PUT',
            fn (array $fx): string => "/user-management/api/users/{$fx['targetUser']->id}",
            'update_users',
            fn (array $fx): array => [
                'name' => 'Updated User',
                'email' => 'updated-user@example.com',
                'roles' => [$fx['baseRole']->id],
            ],
        ],
        'users destroy' => [
            'DELETE',
            fn (array $fx): string => "/user-management/api/users/{$fx['targetUser']->id}",
            'delete_users',
            fn (array $fx): array => [],
        ],
        'users bulk delete' => [
            'POST',
            fn (array $fx): string => '/user-management/api/users/bulk-delete',
            'delete_users',
            fn (array $fx): array => [
                'ids' => [$fx['targetUser']->id],
                'password' => 'password',
            ],
        ],
        'roles index' => [
            'GET',
            fn (array $fx): string => '/user-management/api/roles',
            'access_roles',
            fn (array $fx): array => [],
        ],
        'roles store' => [
            'POST',
            fn (array $fx): string => '/user-management/api/roles',
            'create_roles',
            fn (array $fx): array => [
                'name' => 'Content Manager',
                'permissions' => [],
            ],
        ],
        'roles update' => [
            'PUT',
            fn (array $fx): string => "/user-management/api/roles/{$fx['targetRole']->id}",
            'update_roles',
            fn (array $fx): array => [
                'name' => 'Updated Role',
                'permissions' => [],
            ],
        ],
        'roles destroy' => [
            'DELETE',
            fn (array $fx): string => "/user-management/api/roles/{$fx['targetRole']->id}",
            'delete_roles',
            fn (array $fx): array => [],
        ],
        'roles bulk delete' => [
            'POST',
            fn (array $fx): string => '/user-management/api/roles/bulk-delete',
            'delete_roles',
            fn (array $fx): array => [
                'ids' => [$fx['targetRole']->id],
                'password' => 'password',
            ],
        ],
        'permissions index' => [
            'GET',
            fn (array $fx): string => '/user-management/api/permissions',
            'access_permissions',
            fn (array $fx): array => [],
        ],
        'permissions store' => [
            'POST',
            fn (array $fx): string => '/user-management/api/permissions',
            'create_permissions',
            fn (array $fx): array => [
                'name' => 'permission-created-via-test',
            ],
        ],
        'permissions update' => [
            'PUT',
            fn (array $fx): string => "/user-management/api/permissions/{$fx['targetPermission']->id}",
            'update_permissions',
            fn (array $fx): array => [
                'name' => 'permission-updated-via-test',
            ],
        ],
        'permissions destroy' => [
            'DELETE',
            fn (array $fx): string => "/user-management/api/permissions/{$fx['targetPermission']->id}",
            'delete_permissions',
            fn (array $fx): array => [],
        ],
        'permissions bulk delete' => [
            'POST',
            fn (array $fx): string => '/user-management/api/permissions/bulk-delete',
            'delete_permissions',
            fn (array $fx): array => [
                'ids' => [$fx['targetPermission']->id],
                'password' => 'password',
            ],
        ],
    ];
});

test('guests are redirected from user management api endpoints', function (
    string $method,
    Closure $uri,
    string $permission,
    Closure $payload
): void {
    $fx = userManagementApiFixtures();
    Permission::findOrCreate($permission, 'web');

    $response = performApiRequest($this, $method, $uri($fx), $payload($fx));

    $response->assertRedirect(route('login', absolute: false));
})->with('user management api endpoints');

test('authenticated users without required permission are forbidden for user management api endpoints', function (
    string $method,
    Closure $uri,
    string $permission,
    Closure $payload
): void {
    $fx = userManagementApiFixtures();
    Permission::findOrCreate($permission, 'web');

    $response = performApiRequest(
        $this->actingAs($fx['actingUser']),
        $method,
        $uri($fx),
        $payload($fx)
    );

    $response->assertForbidden();
})->with('user management api endpoints');

test('authenticated users with required permission can access user management api endpoints', function (
    string $method,
    Closure $uri,
    string $permission,
    Closure $payload
): void {
    $fx = userManagementApiFixtures();

    Permission::findOrCreate($permission, 'web');
    $fx['actingUser']->givePermissionTo($permission);

    $response = performApiRequest(
        $this->actingAs($fx['actingUser']),
        $method,
        $uri($fx),
        $payload($fx)
    );

    $response->assertOk();
})->with('user management api endpoints');
