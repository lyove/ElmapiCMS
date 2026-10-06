<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('project_auth_users', function (Blueprint $table) {
            $table->timestamp('suspended_at')->nullable()->after('last_login_at');
            $table->index(['project_id', 'suspended_at']);
        });
    }

    public function down(): void
    {
        Schema::table('project_auth_users', function (Blueprint $table) {
            $table->dropIndex(['project_id', 'suspended_at']);
            $table->dropColumn('suspended_at');
        });
    }
};
