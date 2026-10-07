<?php

namespace App\Models;

use Database\Factories\ProjectAuthEmailVerificationTokenFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAuthEmailVerificationToken extends Model
{
    /** @use HasFactory<ProjectAuthEmailVerificationTokenFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_auth_user_id',
        'token_hash',
        'email',
        'expires_at',
        'consumed_at',
    ];

    protected $hidden = [
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'project_id' => 'integer',
            'project_auth_user_id' => 'integer',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
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
}
