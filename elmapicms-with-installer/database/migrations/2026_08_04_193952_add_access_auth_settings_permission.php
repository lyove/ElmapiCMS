<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permission = Permission::findOrCreate('access_auth_settings', 'web');
        $apiAccessPermission = Permission::query()
            ->where('name', 'access_api_access_settings')
            ->where('guard_name', 'web')
            ->first();

        if (! $apiAccessPermission) {
            return;
        }

        Role::query()
            ->whereHas('permissions', fn ($query) => $query->where('permissions.id', $apiAccessPermission->id))
            ->each(fn (Role $role) => $role->givePermissionTo($permission));

        $apiAccessPermission->users()
            ->each(fn ($user) => $user->givePermissionTo($permission));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::query()
            ->where('name', 'access_auth_settings')
            ->where('guard_name', 'web')
            ->delete();
    }
};
