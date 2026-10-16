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
        Schema::table('project_auth_authorization_codes', function (Blueprint $table) {
            $table->foreign('project_auth_client_id')
                ->references('id')
                ->on('project_auth_clients')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_auth_authorization_codes', function (Blueprint $table) {
            $table->dropForeign(['project_auth_client_id']);
        });
    }
};
