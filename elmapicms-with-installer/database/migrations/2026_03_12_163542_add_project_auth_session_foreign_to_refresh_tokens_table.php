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
        Schema::table('project_auth_refresh_tokens', function (Blueprint $table) {
            $table->foreign('project_auth_session_id')
                ->references('id')
                ->on('project_auth_sessions')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_auth_refresh_tokens', function (Blueprint $table) {
            $table->dropForeign(['project_auth_session_id']);
        });
    }
};
