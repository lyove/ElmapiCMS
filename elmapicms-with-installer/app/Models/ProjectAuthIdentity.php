<?php

namespace App\Models;

use Database\Factories\ProjectAuthIdentityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAuthIdentity extends Model
{
    /** @use HasFactory<ProjectAuthIdentityFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_auth_user_id',
        'provider',
        'provider_subject',
        'provider_email',
        'provider_data',
    ];

    protected function casts(): array
    {
        return [
            'provider_data' => 'array',
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
}
