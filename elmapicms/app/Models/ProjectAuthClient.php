<?php

namespace App\Models;

use Database\Factories\ProjectAuthClientFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProjectAuthClient extends Model
{
    /** @use HasFactory<ProjectAuthClientFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'client_id',
        'client_secret_hash',
        'redirect_uris',
        'allowed_scopes',
        'is_confidential',
        'is_active',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $client): void {
            if (! $client->client_id) {
                $client->client_id = 'client_'.Str::lower(Str::random(24));
            }
        });
    }

    protected function casts(): array
    {
        return [
            'redirect_uris' => 'array',
            'allowed_scopes' => 'array',
            'is_confidential' => 'boolean',
            'is_active' => 'boolean',
            'id' => 'integer',
            'project_id' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function authorizationCodes(): HasMany
    {
        return $this->hasMany(ProjectAuthAuthorizationCode::class);
    }
}
