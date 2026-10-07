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
        Schema::table('content_entries', function (Blueprint $table) {
            $table->renameColumn('status', 'state');
            $table->renameIndex('content_entries_status_locale_index', 'content_entries_state_locale_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('content_entries', function (Blueprint $table) {
            $table->renameColumn('state', 'status');
            $table->renameIndex('content_entries_state_locale_index', 'content_entries_status_locale_index');
        });
    }
};
