<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->string('theme_preset_key')->nullable()->after('theme_tokens');
            $table->json('theme_custom_tokens')->nullable()->after('theme_preset_key');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn([
                'theme_preset_key',
                'theme_custom_tokens',
            ]);
        });
    }
};
