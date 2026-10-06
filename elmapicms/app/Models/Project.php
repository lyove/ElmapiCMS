<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class Project extends Model
{
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'preview_url',
        'default_locale',
        'locales',
        'disk',
        'public_api',
        'project_auth_require_verified_email',
        'project_auth_email_verification_config',
    ];

    protected $casts = [
        'public_api' => 'boolean',
        'project_auth_require_verified_email' => 'boolean',
        'project_auth_email_verification_config' => 'array',
        'locales' => 'array',
        'id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($project) {
            $project->uuid = (string) Str::uuid();
        });
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class)->orderBy('order');
    }

    public function content(): HasMany
    {
        return $this->hasMany(ContentEntry::class);
    }

    public function members()
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    public function webhooks(): HasMany
    {
        return $this->hasMany(Webhook::class);
    }

    public function authUsers(): HasMany
    {
        return $this->hasMany(ProjectAuthUser::class);
    }

    public function authSessions(): HasMany
    {
        return $this->hasMany(ProjectAuthSession::class);
    }

    public function authRefreshTokens(): HasMany
    {
        return $this->hasMany(ProjectAuthRefreshToken::class);
    }

    public function authJwtKeys(): HasMany
    {
        return $this->hasMany(ProjectAuthJwtKey::class);
    }

    public function authAuditEvents(): HasMany
    {
        return $this->hasMany(ProjectAuthAuditEvent::class);
    }

    public function authClients(): HasMany
    {
        return $this->hasMany(ProjectAuthClient::class);
    }

    public function authAuthorizationCodes(): HasMany
    {
        return $this->hasMany(ProjectAuthAuthorizationCode::class);
    }

    public function authApiKeys(): HasMany
    {
        return $this->hasMany(ProjectAuthApiKey::class);
    }

    public function authEmailVerificationTokens(): HasMany
    {
        return $this->hasMany(ProjectAuthEmailVerificationToken::class);
    }
}
