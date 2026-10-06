<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetUploadIntent extends Model
{
    public const MODE_SINGLE_PUT = 'single_put';

    public const MODE_MULTIPART = 'multipart';

    protected $fillable = [
        'uuid',
        'project_id',
        'storage_key',
        'original_filename',
        'client_mime_type',
        'max_bytes',
        'mode',
        's3_multipart_upload_id',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
