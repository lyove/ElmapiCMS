<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('project_templates')
            ->whereIn('slug', ['blog-next-js', 'landing-page-nextjs'])
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now()]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('project_templates')
            ->whereIn('slug', ['blog-next-js', 'landing-page-nextjs'])
            ->update(['deleted_at' => null]);
    }
};
