<?php

namespace App\Models;

use Database\Factories\ProjectAuthRefreshTokenFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProjectAuthRefreshToken extends Model
{
    /** @use HasFactory<ProjectAuthRefreshTokenFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_auth_user_id',
        'project_auth_session_id',
        'family_uuid',
        'token_hash',
        'replaced_by_token_id',
        'last_used_at',
        'expires_at',
        'revoked_at',
        'reused_at',
        'issued_ip',
        'issued_user_agent',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $token): void {
            if (! $token->family_uuid) {
                $token->family_uuid = (string) Str::uuid();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'reused_at' => 'datetime',
            'id' => 'integer',
            'project_id' => 'integer',
            'project_auth_user_id' => 'integer',
            'project_auth_session_id' => 'integer',
            'replaced_by_token_id' => 'integer',
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

    public function session(): BelongsTo
    {
        return $this->belongsTo(ProjectAuthSession::class, 'project_auth_session_id');
    }

    public function replacedByToken(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaced_by_token_id');
    }

    public function previousTokens(): HasMany
    {
        return $this->hasMany(self::class, 'replaced_by_token_id');
    }
}
