<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WebhookResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'description' => $this->description,
            'url' => $this->url,
            'events' => $this->events ?? [],
            'sources' => $this->sources ?? [],
            'payload' => (bool) $this->payload,
            'status' => (bool) $this->status,
            'collections' => $this->whenLoaded('collections', function () {
                return $this->collections->map(function ($collection) {
                    return [
                        'id' => $collection->id,
                        'uuid' => $collection->uuid,
                        'name' => $collection->name,
                        'slug' => $collection->slug,
                    ];
                })->values();
            }, []),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
