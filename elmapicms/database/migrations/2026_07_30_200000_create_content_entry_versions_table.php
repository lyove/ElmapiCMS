<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_entry_versions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('content_entry_id')->constrained('content_entries')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->string('locale');
            $table->uuid('translation_group_id')->nullable();
            $table->unsignedInteger('version_number');
            $table->string('label')->nullable();
            $table->text('description')->nullable();
            $table->json('snapshot');
            $table->timestamp('published_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['content_entry_id', 'version_number'], 'content_entry_versions_entry_number_unique');
            $table->index('project_id');
            $table->index('collection_id');
            $table->index(['content_entry_id', 'version_number']);
            $table->index('translation_group_id');
        });

        Schema::table('content_entries', function (Blueprint $table) {
            $table->foreignId('published_version_id')
                ->nullable()
                ->after('published_at')
                ->constrained('content_entry_versions')
                ->nullOnDelete();
            $table->unsignedInteger('published_version_number')->nullable()->after('published_version_id');
            $table->boolean('is_draft_dirty')->default(false)->after('published_version_number');

            $table->index('published_version_id');
        });
    }

    public function down(): void
    {
        Schema::table('content_entries', function (Blueprint $table) {
            $table->dropForeign(['published_version_id']);
            $table->dropIndex(['published_version_id']);
            $table->dropColumn(['published_version_id', 'published_version_number', 'is_draft_dirty']);
        });

        Schema::dropIfExists('content_entry_versions');
    }
};
