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
        Schema::create('project_auth_email_verification_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('project_auth_user_id');
            $table->string('token_hash', 64)->unique();
            $table->string('email');
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->foreign('project_id', 'paevt_project_fk')
                ->references('id')
                ->on('projects')
                ->cascadeOnDelete();
            $table->foreign('project_auth_user_id', 'paevt_user_fk')
                ->references('id')
                ->on('project_auth_users')
                ->cascadeOnDelete();

            $table->index(['project_id', 'project_auth_user_id'], 'paevt_project_user_idx');
            $table->index(['project_auth_user_id', 'expires_at'], 'paevt_user_expires_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_auth_email_verification_tokens');
    }
};
