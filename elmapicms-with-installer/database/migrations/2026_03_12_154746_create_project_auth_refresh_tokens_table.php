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
        if (Schema::hasTable('project_auth_refresh_tokens')) {
            return;
        }

        Schema::create('project_auth_refresh_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_auth_user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('project_auth_session_id');
            $table->uuid('family_uuid');
            $table->string('token_hash', 128)->unique();
            $table->foreignId('replaced_by_token_id')->nullable()->constrained('project_auth_refresh_tokens')->nullOnDelete();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('reused_at')->nullable();
            $table->string('issued_ip', 45)->nullable();
            $table->text('issued_user_agent')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'family_uuid'], 'part_project_family_idx');
            $table->index(['project_auth_user_id', 'expires_at'], 'part_user_expires_idx');
            $table->index(['project_auth_session_id', 'expires_at'], 'part_session_expires_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_auth_refresh_tokens');
    }
};
