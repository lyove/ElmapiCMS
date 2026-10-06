<?php

namespace App\Models;

use Database\Factories\ProjectAuthSessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProjectAuthSession extends Model
{
    /** @use HasFactory<ProjectAuthSessionFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_auth_user_id',
        'session_uuid',
        'ip_address',
        'user_agent',
        'last_activity_at',
        'expires_at',
        'revoked_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $session): void {
            if (! $session->session_uuid) {
                $session->session_uuid = (string) Str::uuid();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'last_activity_at' => 'datetime',
            'expires_at' => 'datetime',
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

    public function refreshTokens(): HasMany
    {
        return $this->hasMany(ProjectAuthRefreshToken::class);
    }

    public function auditEvents(): HasMany
    {
        return $this->hasMany(ProjectAuthAuditEvent::class);
    }
}
