<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'uuid' => $this->uuid,
            'filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'size' => $this->formatted_size,
            'url' => $this->full_url,
            'original_url' => $this->original_url,
            'thumbnail_url' => $this->thumbnail_url,
            'pending_image_processing' => (bool) $this->pending_image_processing,
            'metadata' => $this->whenLoaded('metadata', fn () => $this->metadata),
        ];
    }
}
