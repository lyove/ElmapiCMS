<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ContentEntryVersionResource extends JsonResource
{
    protected bool $withSnapshot = false;

    public function withSnapshot(bool $flag = true): self
    {
        $this->withSnapshot = $flag;

        return $this;
    }

    public function toArray($request)
    {
        $data = [
            'uuid' => $this->uuid,
            'version_number' => $this->version_number,
            'label' => $this->label,
            'description' => $this->description,
            'locale' => $this->locale,
            'translation_group_id' => $this->translation_group_id,
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'is_current_published' => $this->resource->content_entry_id
                && $this->resource->entry
                && $this->resource->entry->published_version_id === $this->resource->id,
        ];

        if ($this->resource->relationLoaded('creator') && $this->creator) {
            $data['created_by'] = [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ];
        } else {
            $data['created_by'] = $this->created_by ? ['id' => (int) $this->created_by] : null;
        }

        if ($this->withSnapshot) {
            $data['snapshot'] = $this->snapshot;
        }

        return $data;
    }
}
