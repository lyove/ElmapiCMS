<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function grantPermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('users api store persists user and syncs selected role', function (): void {
    $actingUser = User::factory()->create();
    $memberRole = Role::create(['name' => 'Member']);

    grantPermission($actingUser, 'create_users');

    $response = $this->actingAs($actingUser)->post('/user-management/api/users', [
        'name' => 'API Created User',
        'email' => 'api-created-user@example.com',
        'password' => 'password123',
        'roles' => [$memberRole->id],
    ]);

    $response->assertOk();
    $this->assertDatabaseHas('users', ['email' => 'api-created-user@example.com']);

    $createdUser = User::where('email', 'api-created-user@example.com')->firstOrFail();
    expect($createdUser->roles()->pluck('roles.id')->all())->toContain($memberRole->id);
});

test('users api store validates required fields', function (): void {
    $actingUser = User::factory()->create();

    grantPermission($actingUser, 'create_users');

    $response = $this->actingAs($actingUser)->post('/user-management/api/users', [
        'name' => '',
        'email' => 'not-an-email',
        'password' => 'short',
        'roles' => [],
    ]);

    $response->assertInvalid(['name', 'email', 'password']);
});

test('users api update changes user profile and roles', function (): void {
    $actingUser = User::factory()->create();
    $targetUser = User::factory()->create(['email' => 'before-update@example.com']);
    $editorRole = Role::create(['name' => 'Editor']);

    grantPermission($actingUser, 'update_users');

    $response = $this->actingAs($actingUser)->put("/user-management/api/users/{$targetUser->id}", [
        'name' => 'Updated Name',
        'email' => 'after-update@example.com',
        'roles' => [$editorRole->id],
    ]);

    $response->assertOk();
    $this->assertDatabaseHas('users', [
        'id' => $targetUser->id,
        'name' => 'Updated Name',
        'email' => 'after-update@example.com',
    ]);

    $targetUser->refresh();
    expect($targetUser->roles()->pluck('roles.id')->all())->toContain($editorRole->id);
});

test('users api destroy rejects deleting super admin users', function (): void {
    $actingUser = User::factory()->create();
    $superAdminRole = Role::create(['name' => 'Super Admin']);
    $superAdminUser = User::factory()->create();
    $superAdminUser->assignRole($superAdminRole);

    grantPermission($actingUser, 'delete_users');

    $response = $this->actingAs($actingUser)->delete("/user-management/api/users/{$superAdminUser->id}");

    $response->assertStatus(422);
    $response->assertJson(['error' => 'Super Admin role cannot be deleted.']);
    $this->assertDatabaseHas('users', ['id' => $superAdminUser->id]);
});

test('users api bulk delete rejects deleting super admin users', function (): void {
    $actingUser = User::factory()->create([
        'password' => Hash::make('password'),
    ]);
    $superAdminRole = Role::create(['name' => 'Super Admin']);
    $superAdminUser = User::factory()->create();
    $superAdminUser->assignRole($superAdminRole);

    grantPermission($actingUser, 'delete_users');

    $response = $this->actingAs($actingUser)->post('/user-management/api/users/bulk-delete', [
        'ids' => [$superAdminUser->id],
        'password' => 'password',
    ]);

    $response->assertStatus(422);
    $response->assertJson(['error' => 'Cannot delete users with Super Admin role.']);
    $this->assertDatabaseHas('users', ['id' => $superAdminUser->id]);
});

test('roles api destroy rejects deleting super admin role', function (): void {
    $actingUser = User::factory()->create();
    $superAdminRole = Role::create(['name' => 'Super Admin']);

    grantPermission($actingUser, 'delete_roles');

    $response = $this->actingAs($actingUser)->delete("/user-management/api/roles/{$superAdminRole->id}");

    $response->assertStatus(422);
    $response->assertJson(['error' => 'Super Admin role cannot be deleted.']);
    $this->assertDatabaseHas('roles', ['id' => $superAdminRole->id]);
});

test('roles api bulk delete rejects deleting super admin role', function (): void {
    $actingUser = User::factory()->create([
        'password' => Hash::make('password'),
    ]);
    $superAdminRole = Role::create(['name' => 'Super Admin']);

    grantPermission($actingUser, 'delete_roles');

    $response = $this->actingAs($actingUser)->post('/user-management/api/roles/bulk-delete', [
        'ids' => [$superAdminRole->id],
        'password' => 'password',
    ]);

    $response->assertStatus(422);
    $response->assertJson(['error' => 'Cannot delete Super Admin role.']);
    $this->assertDatabaseHas('roles', ['id' => $superAdminRole->id]);
});

test('permissions api store creates a new permission', function (): void {
    $actingUser = User::factory()->create();

    grantPermission($actingUser, 'create_permissions');

    $response = $this->actingAs($actingUser)->post('/user-management/api/permissions', [
        'name' => 'manage_reports',
    ]);

    $response->assertOk();
    $this->assertDatabaseHas('permissions', ['name' => 'manage_reports']);
});
