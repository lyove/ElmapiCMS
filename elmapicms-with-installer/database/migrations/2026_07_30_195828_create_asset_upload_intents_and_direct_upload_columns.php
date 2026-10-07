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
        Schema::table('assets', function (Blueprint $table) {
            $table->boolean('pending_image_processing')->default(false)->after('original_path');
        });

        Schema::create('asset_upload_intents', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('storage_key', 500);
            $table->string('original_filename');
            $table->string('client_mime_type', 255)->nullable();
            $table->unsignedBigInteger('max_bytes');
            $table->string('mode', 32)->default('single_put');
            $table->string('s3_multipart_upload_id', 255)->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['project_id', 'expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_upload_intents');

        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn('pending_image_processing');
        });
    }
};
