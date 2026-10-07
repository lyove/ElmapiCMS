<?php

namespace App\Models;

use Database\Factories\ProjectAuthUserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectAuthUser extends Model
{
    /** @use HasFactory<ProjectAuthUserFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'uuid',
        'email',
        'email_verified_at',
        'password',
        'display_name',
        'metadata',
        'last_login_at',
        'suspended_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $user): void {
            if (! $user->uuid) {
                $user->uuid = (string) Str::uuid();
            }
        });

        static::deleting(function (self $user): void {
            if ($user->isForceDeleting()) {
                return;
            }

            $originalEmail = (string) $user->email;
            $deletedAt = now()->toIso8601String();

            $auditEvents = ProjectAuthAuditEvent::query()
                ->where('project_id', $user->project_id)
                ->where('project_auth_user_id', $user->id)
                ->get();

            foreach ($auditEvents as $auditEvent) {
                $eventMetadata = is_array($auditEvent->metadata) ? $auditEvent->metadata : [];
                $eventMetadata['deleted_user_email'] = $originalEmail;
                $eventMetadata['deleted_user_display_name'] = $user->display_name;
                $eventMetadata['deleted_user_uuid'] = $user->uuid;
                $eventMetadata['deleted_user_at'] = $deletedAt;
                $auditEvent->metadata = $eventMetadata;
                $auditEvent->save();
            }

            $suffix = '__deleted_'.$user->id.'_'.Str::lower(Str::random(8));
            $maxBaseLength = max(1, 255 - mb_strlen($suffix));
            $user->email = mb_substr($originalEmail, 0, $maxBaseLength).$suffix;

            $metadata = is_array($user->metadata) ? $user->metadata : [];
            if (! array_key_exists('deleted_email', $metadata)) {
                $metadata['deleted_email'] = $originalEmail;
            }
            $user->metadata = $metadata;

            $user->saveQuietly();
        });
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'metadata' => 'array',
            'last_login_at' => 'datetime',
            'suspended_at' => 'datetime',
            'password' => 'hashed',
            'id' => 'integer',
            'project_id' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function identities(): HasMany
    {
        return $this->hasMany(ProjectAuthIdentity::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ProjectAuthSession::class);
    }

    public function refreshTokens(): HasMany
    {
        return $this->hasMany(ProjectAuthRefreshToken::class);
    }

    public function auditEvents(): HasMany
    {
        return $this->hasMany(ProjectAuthAuditEvent::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ProjectAuthApiKey::class);
    }

    public function emailVerificationTokens(): HasMany
    {
        return $this->hasMany(ProjectAuthEmailVerificationToken::class);
    }
}
