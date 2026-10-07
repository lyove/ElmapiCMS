<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('asset_metadata as current')
            ->join('asset_metadata as duplicate', function ($join) {
                $join->on('current.asset_id', '=', 'duplicate.asset_id')
                    ->whereColumn('current.id', '<', 'duplicate.id');
            })
            ->select('duplicate.id')
            ->orderBy('duplicate.id')
            ->chunk(500, function ($rows) {
                DB::table('asset_metadata')->whereIn('id', $rows->pluck('id'))->delete();
            });

        // MySQL cannot drop an index that backs a foreign key. Drop the FK first,
        // replace the non-unique index with a unique index, then restore the FK.
        Schema::table('asset_metadata', function (Blueprint $table) {
            $table->dropForeign(['asset_id']);
        });

        Schema::table('asset_metadata', function (Blueprint $table) {
            $table->dropIndex(['asset_id']);
            $table->unique('asset_id');
            $table->foreign('asset_id')
                ->references('id')
                ->on('assets')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asset_metadata', function (Blueprint $table) {
            $table->dropForeign(['asset_id']);
        });

        Schema::table('asset_metadata', function (Blueprint $table) {
            $table->dropUnique(['asset_id']);
            $table->index('asset_id');
            $table->foreign('asset_id')
                ->references('id')
                ->on('assets')
                ->cascadeOnDelete();
        });
    }
};
