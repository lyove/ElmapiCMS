<?php

namespace App\Models;

use Database\Factories\ProjectAuthAuthorizationCodeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAuthAuthorizationCode extends Model
{
    /** @use HasFactory<ProjectAuthAuthorizationCodeFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_auth_user_id',
        'project_auth_session_id',
        'project_auth_client_id',
        'code_hash',
        'redirect_uri',
        'code_challenge',
        'code_challenge_method',
        'scopes',
        'expires_at',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
            'id' => 'integer',
            'project_id' => 'integer',
            'project_auth_user_id' => 'integer',
            'project_auth_session_id' => 'integer',
            'project_auth_client_id' => 'integer',
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

    public function client(): BelongsTo
    {
        return $this->belongsTo(ProjectAuthClient::class, 'project_auth_client_id');
    }
}
