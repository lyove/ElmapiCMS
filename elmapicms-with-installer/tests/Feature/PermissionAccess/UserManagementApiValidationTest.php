<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function allow(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('users api store rejects duplicate email', function (): void {
    $actingUser = User::factory()->create();
    $memberRole = Role::create(['name' => 'Member']);
    User::factory()->create(['email' => 'duplicate@example.com']);

    allow($actingUser, 'create_users');

    $response = $this->actingAs($actingUser)->post('/user-management/api/users', [
        'name' => 'Duplicate Attempt',
        'email' => 'duplicate@example.com',
        'password' => 'password123',
        'roles' => [$memberRole->id],
    ]);

    $response->assertInvalid(['email']);
});

test('users api update rejects email used by another user', function (): void {
    $actingUser = User::factory()->create();
    $memberRole = Role::create(['name' => 'Member']);
    $targetUser = User::factory()->create(['email' => 'target@example.com']);
    $otherUser = User::factory()->create(['email' => 'already-used@example.com']);

    allow($actingUser, 'update_users');

    $response = $this->actingAs($actingUser)->put("/user-management/api/users/{$targetUser->id}", [
        'name' => 'Target User',
        'email' => $otherUser->email,
        'roles' => [$memberRole->id],
    ]);

    $response->assertInvalid(['email']);
});

test('users api store requires roles to be an array', function (): void {
    $actingUser = User::factory()->create();

    allow($actingUser, 'create_users');

    $response = $this->actingAs($actingUser)->post('/user-management/api/users', [
        'name' => 'Bad Payload',
        'email' => 'bad-payload@example.com',
        'password' => 'password123',
        'roles' => 'not-an-array',
    ]);

    $response->assertInvalid(['roles']);
});

test('users api bulk delete validates ids and current password', function (): void {
    $actingUser = User::factory()->create([
        'password' => Hash::make('password'),
    ]);

    allow($actingUser, 'delete_users');

    $invalidIdsResponse = $this->actingAs($actingUser)->post('/user-management/api/users/bulk-delete', [
        'ids' => [999999],
        'password' => 'password',
    ]);

    $invalidIdsResponse->assertInvalid(['ids.0']);

    $invalidPasswordResponse = $this->actingAs($actingUser)->post('/user-management/api/users/bulk-delete', [
        'ids' => [$actingUser->id],
        'password' => 'wrong-password',
    ]);

    $invalidPasswordResponse->assertInvalid(['password']);
});

test('roles api store rejects duplicate role names', function (): void {
    $actingUser = User::factory()->create();
    Role::create(['name' => 'Content Manager']);

    allow($actingUser, 'create_roles');

    $response = $this->actingAs($actingUser)->post('/user-management/api/roles', [
        'name' => 'Content Manager',
        'permissions' => [],
    ]);

    $response->assertInvalid(['name']);
});

test('roles api bulk delete validates ids and current password', function (): void {
    $actingUser = User::factory()->create([
        'password' => Hash::make('password'),
    ]);

    allow($actingUser, 'delete_roles');

    $invalidIdsResponse = $this->actingAs($actingUser)->post('/user-management/api/roles/bulk-delete', [
        'ids' => [999999],
        'password' => 'password',
    ]);

    $invalidIdsResponse->assertInvalid(['ids.0']);

    $invalidPasswordResponse = $this->actingAs($actingUser)->post('/user-management/api/roles/bulk-delete', [
        'ids' => [1],
        'password' => 'wrong-password',
    ]);

    $invalidPasswordResponse->assertInvalid(['password']);
});

test('permissions api store rejects duplicate permission names', function (): void {
    $actingUser = User::factory()->create();
    Permission::create(['name' => 'publish_reports']);

    allow($actingUser, 'create_permissions');

    $response = $this->actingAs($actingUser)->post('/user-management/api/permissions', [
        'name' => 'publish_reports',
    ]);

    $response->assertInvalid(['name']);
});

test('permissions api bulk delete validates ids and current password', function (): void {
    $actingUser = User::factory()->create([
        'password' => Hash::make('password'),
    ]);

    allow($actingUser, 'delete_permissions');

    $invalidIdsResponse = $this->actingAs($actingUser)->post('/user-management/api/permissions/bulk-delete', [
        'ids' => [999999],
        'password' => 'password',
    ]);

    $invalidIdsResponse->assertInvalid(['ids.0']);

    $invalidPasswordResponse = $this->actingAs($actingUser)->post('/user-management/api/permissions/bulk-delete', [
        'ids' => [$actingUser->id],
        'password' => 'wrong-password',
    ]);

    $invalidPasswordResponse->assertInvalid(['password']);
});
