<?php

namespace App\Services\Auth;

use App\Models\Project;
use App\Models\ProjectAuthAuditEvent;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use Illuminate\Http\Request;

class AuthAuditEventService
{
    public function log(
        Project $project,
        string $eventType,
        array $metadata = [],
        ?ProjectAuthUser $authUser = null,
        ?ProjectAuthSession $session = null,
        array $riskFlags = [],
        ?Request $request = null
    ): void {
        ProjectAuthAuditEvent::query()->create([
            'project_id' => $project->id,
            'project_auth_user_id' => $authUser?->id,
            'project_auth_session_id' => $session?->id,
            'event_type' => $eventType,
            'request_id' => $request?->headers->get('X-Request-Id') ?: $request?->attributes->get('request_id'),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'risk_flags' => array_values($riskFlags),
            'metadata' => $metadata,
            'occurred_at' => now(),
        ]);
    }
}
