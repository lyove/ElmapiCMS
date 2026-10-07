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
        if (Schema::hasTable('project_auth_authorization_codes')) {
            return;
        }

        Schema::create('project_auth_authorization_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_auth_user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('project_auth_session_id')->nullable();
            $table->unsignedBigInteger('project_auth_client_id');
            $table->string('code_hash', 128)->unique();
            $table->string('redirect_uri');
            $table->string('code_challenge', 128);
            $table->string('code_challenge_method', 20)->default('S256');
            $table->json('scopes')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'project_auth_client_id'], 'paac_project_client_idx');
            $table->index(['project_auth_user_id', 'expires_at'], 'paac_user_expires_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_auth_authorization_codes');
    }
};
