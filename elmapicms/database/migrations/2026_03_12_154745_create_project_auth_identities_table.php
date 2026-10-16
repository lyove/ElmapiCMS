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
        Schema::create('project_auth_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_auth_user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 40);
            $table->string('provider_subject');
            $table->string('provider_email')->nullable();
            $table->json('provider_data')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'provider', 'provider_subject'], 'project_auth_identity_provider_unique');
            $table->index(['project_auth_user_id', 'provider']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_auth_identities');
    }
};
