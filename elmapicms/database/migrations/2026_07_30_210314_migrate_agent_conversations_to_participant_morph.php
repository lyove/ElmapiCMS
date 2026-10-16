<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Align agent conversation tables with laravel/ai v0.10+
 * (polymorphic participant columns + approval_state).
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->migrateConversationsTable();
        $this->migrateMessagesTable();
    }

    public function down(): void
    {
        if (Schema::hasColumn('agent_conversations', 'participant_type')
            && ! Schema::hasColumn('agent_conversations', 'user_id')) {
            Schema::table('agent_conversations', function (Blueprint $table) {
                $table->dropIndex('participant_updated_at_index');
                $table->unsignedBigInteger('user_id')->nullable()->after('id');
            });

            DB::table('agent_conversations')
                ->where('participant_type', User::class)
                ->whereNotNull('participant_id')
                ->update([
                    'user_id' => DB::raw('participant_id'),
                ]);

            Schema::table('agent_conversations', function (Blueprint $table) {
                $table->dropColumn(['participant_type', 'participant_id']);
                $table->index(['user_id', 'updated_at']);
            });
        }

        if (Schema::hasColumn('agent_conversation_messages', 'participant_type')
            && ! Schema::hasColumn('agent_conversation_messages', 'user_id')) {
            Schema::table('agent_conversation_messages', function (Blueprint $table) {
                $table->dropIndex('conversation_index');
                $table->dropIndex('participant_index');
                $table->unsignedBigInteger('user_id')->nullable()->after('conversation_id');
            });

            DB::table('agent_conversation_messages')
                ->where('participant_type', User::class)
                ->whereNotNull('participant_id')
                ->update([
                    'user_id' => DB::raw('participant_id'),
                ]);

            Schema::table('agent_conversation_messages', function (Blueprint $table) {
                $table->dropColumn(['participant_type', 'participant_id', 'approval_state']);
                $table->index(['conversation_id', 'user_id', 'updated_at'], 'conversation_index');
                $table->index(['user_id']);
            });
        }
    }

    private function migrateConversationsTable(): void
    {
        if (! Schema::hasTable('agent_conversations')) {
            return;
        }

        if (Schema::hasColumn('agent_conversations', 'user_id')
            && ! Schema::hasColumn('agent_conversations', 'participant_type')) {
            Schema::table('agent_conversations', function (Blueprint $table) {
                $table->dropIndex(['user_id', 'updated_at']);
                $table->string('participant_type')->nullable()->after('id');
                $table->unsignedBigInteger('participant_id')->nullable()->after('participant_type');
            });

            DB::table('agent_conversations')->orderBy('id')->chunkById(100, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('agent_conversations')
                        ->where('id', $row->id)
                        ->update([
                            'participant_type' => User::class,
                            'participant_id' => $row->user_id,
                        ]);
                }
            }, 'id');

            Schema::table('agent_conversations', function (Blueprint $table) {
                $table->dropColumn('user_id');
                $table->index(['participant_type', 'participant_id', 'updated_at'], 'participant_updated_at_index');
            });
        }
    }

    private function migrateMessagesTable(): void
    {
        if (! Schema::hasTable('agent_conversation_messages')) {
            return;
        }

        if (Schema::hasColumn('agent_conversation_messages', 'user_id')
            && ! Schema::hasColumn('agent_conversation_messages', 'participant_type')) {
            Schema::table('agent_conversation_messages', function (Blueprint $table) {
                $table->dropIndex('conversation_index');
                $table->dropIndex(['user_id']);
                $table->string('participant_type')->nullable()->after('conversation_id');
                $table->unsignedBigInteger('participant_id')->nullable()->after('participant_type');
            });

            DB::table('agent_conversation_messages')->orderBy('id')->chunkById(100, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('agent_conversation_messages')
                        ->where('id', $row->id)
                        ->update([
                            'participant_type' => User::class,
                            'participant_id' => $row->user_id,
                        ]);
                }
            }, 'id');

            Schema::table('agent_conversation_messages', function (Blueprint $table) {
                $table->dropColumn('user_id');
                $table->index(['conversation_id', 'participant_type', 'participant_id', 'updated_at'], 'conversation_index');
                $table->index(['participant_type', 'participant_id'], 'participant_index');
            });
        }

        if (! Schema::hasColumn('agent_conversation_messages', 'approval_state')) {
            Schema::table('agent_conversation_messages', function (Blueprint $table) {
                $table->text('approval_state')->nullable()->after('meta');
            });
        }
    }
};
