<?php

namespace App\Jobs;

use App\Models\Asset;
use App\Services\AssetService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessDirectUploadedImageJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $assetId) {}

    public function handle(AssetService $assetService): void
    {
        $asset = Asset::query()->find($this->assetId);
        if ($asset === null) {
            return;
        }

        if (! $asset->pending_image_processing) {
            return;
        }

        $assetService->processDirectUploadedImage($asset);
    }
}
