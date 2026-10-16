<?php

namespace App\Services\Auth;

use App\Models\Project;
use App\Models\ProjectAuthRefreshToken;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use Illuminate\Support\Str;

class RefreshTokenService
{
    public function issue(Project $project, ProjectAuthUser $authUser, ProjectAuthSession $session, ?string $familyUuid = null, ?string $issuedIp = null, ?string $issuedUserAgent = null): array
    {
        $rawToken = Str::random(96);
        $familyUuid = $familyUuid ?: (string) Str::uuid();
        $expiresAt = now()->addDays((int) config('project_auth.refresh_token_ttl_days', 30));

        $token = ProjectAuthRefreshToken::query()->create([
            'project_id' => $project->id,
            'project_auth_user_id' => $authUser->id,
            'project_auth_session_id' => $session->id,
            'family_uuid' => $familyUuid,
            'token_hash' => $this->hash($rawToken),
            'expires_at' => $expiresAt,
            'issued_ip' => $issuedIp,
            'issued_user_agent' => $issuedUserAgent,
        ]);

        return [
            'raw' => $rawToken,
            'model' => $token,
            'expires_at' => $expiresAt,
        ];
    }

    public function rotate(Project $project, string $rawRefreshToken, ?string $ipAddress = null, ?string $userAgent = null): ?array
    {
        $token = ProjectAuthRefreshToken::query()
            ->with(['authUser', 'session'])
            ->where('project_id', $project->id)
            ->where('token_hash', $this->hash($rawRefreshToken))
            ->first();

        if (! $token) {
            return null;
        }

        if ($token->reused_at || $token->revoked_at) {
            $this->revokeFamily($project, $token->family_uuid, now(), true);

            return null;
        }

        if ($token->expires_at->isPast() || $token->session->revoked_at) {
            $token->update(['revoked_at' => now()]);

            return null;
        }

        $replacement = $this->issue(
            $project,
            $token->authUser,
            $token->session,
            $token->family_uuid,
            $ipAddress,
            $userAgent
        );

        $token->update([
            'last_used_at' => now(),
            'replaced_by_token_id' => $replacement['model']->id,
            'revoked_at' => now(),
        ]);

        return [
            'old' => $token,
            'new' => $replacement['model'],
            'refresh_token' => $replacement['raw'],
            'auth_user' => $token->authUser,
            'session' => $token->session,
            'family_uuid' => $token->family_uuid,
        ];
    }

    public function revokeFamily(Project $project, string $familyUuid, $timestamp, bool $markReuse = false): void
    {
        $query = ProjectAuthRefreshToken::query()
            ->where('project_id', $project->id)
            ->where('family_uuid', $familyUuid);

        $payload = ['revoked_at' => $timestamp];

        if ($markReuse) {
            $payload['reused_at'] = $timestamp;
        }

        $query->update($payload);
    }

    public function revokeSession(ProjectAuthSession $session): void
    {
        $now = now();

        $session->update(['revoked_at' => $now]);

        ProjectAuthRefreshToken::query()
            ->where('project_auth_session_id', $session->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => $now]);
    }

    protected function hash(string $token): string
    {
        return hash('sha256', $token);
    }
}
