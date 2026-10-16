<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Webhook extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'uuid',
        'name',
        'description',
        'url',
        'secret',
        'events',
        'sources',
        'payload',
        'status',
        'created_by',
    ];

    protected $casts = [
        'events' => 'array',
        'sources' => 'array',
        'payload' => 'boolean',
        'status' => 'boolean',
        'id' => 'integer',
        'project_id' => 'integer',
        'created_by' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($webhook) {
            if (! $webhook->uuid) {
                $webhook->uuid = (string) Str::uuid();
            }
        });
    }

    /* -------------------- Relationships -------------------- */

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'webhook_collections');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(WebhookLog::class);
    }
}
