<?php

namespace App\Models;

use Database\Factories\ProjectAuthAuditEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAuthAuditEvent extends Model
{
    /** @use HasFactory<ProjectAuthAuditEventFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_auth_user_id',
        'project_auth_session_id',
        'event_type',
        'request_id',
        'ip_address',
        'user_agent',
        'risk_flags',
        'metadata',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'risk_flags' => 'array',
            'metadata' => 'array',
            'occurred_at' => 'datetime',
            'id' => 'integer',
            'project_id' => 'integer',
            'project_auth_user_id' => 'integer',
            'project_auth_session_id' => 'integer',
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
}
