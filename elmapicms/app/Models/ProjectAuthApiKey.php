<?php

namespace App\Models;

use Database\Factories\ProjectAuthApiKeyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAuthApiKey extends Model
{
    /** @use HasFactory<ProjectAuthApiKeyFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_auth_user_id',
        'name',
        'key_prefix',
        'key_hash',
        'scopes',
        'expires_at',
        'last_used_at',
        'revoked_at',
    ];

    protected $hidden = [
        'key_hash',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
            'id' => 'integer',
            'project_id' => 'integer',
            'project_auth_user_id' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function authUser(): BelongsTo
    {
        return $this->belongsTo(ProjectAuthUser::class, 'project_auth_user_id');
    }

    public function isActive(): bool
    {
        if ($this->revoked_at) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }
}
