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
        Schema::create('project_auth_api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_auth_user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('key_prefix', 24);
            $table->string('key_hash', 128)->unique();
            $table->json('scopes')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'project_auth_user_id'], 'paak_project_user_idx');
            $table->index(['project_id', 'revoked_at'], 'paak_project_revoked_idx');
            $table->index(['project_auth_user_id', 'expires_at'], 'paak_user_expires_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_auth_api_keys');
    }
};
