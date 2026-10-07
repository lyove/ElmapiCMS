<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->boolean('ai_enabled')->default(false);
            $table->string('ai_provider')->default('anthropic');
            $table->string('ai_model')->nullable();
            $table->boolean('ai_show_token_usage')->default(false);
            $table->unsignedSmallInteger('ai_max_conversation_messages')->default(10);
            $table->unsignedInteger('ai_max_tokens')->default(4096);
            $table->unsignedSmallInteger('ai_max_steps')->default(8);
        });

        Schema::table('agent_conversations', function (Blueprint $table) {
            $table->json('context')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn([
                'ai_enabled',
                'ai_provider',
                'ai_model',
                'ai_show_token_usage',
                'ai_max_conversation_messages',
                'ai_max_tokens',
                'ai_max_steps',
            ]);
        });

        Schema::table('agent_conversations', function (Blueprint $table) {
            $table->dropColumn('context');
        });
    }
};
