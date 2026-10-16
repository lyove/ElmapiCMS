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
        if (Schema::hasTable('project_auth_audit_events')) {
            return;
        }

        Schema::create('project_auth_audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_auth_user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('project_auth_session_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type');
            $table->string('request_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('risk_flags')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['project_id', 'event_type', 'occurred_at'], 'paae_project_event_occurred_idx');
            $table->index(['project_auth_user_id', 'occurred_at'], 'paae_user_occurred_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_auth_audit_events');
    }
};
