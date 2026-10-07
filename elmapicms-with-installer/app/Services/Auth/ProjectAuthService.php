<?php

namespace App\Services\Auth;

use App\Events\ProjectAuthEvent;
use App\Exceptions\ProjectAuthEmailVerificationRequiredException;
use App\Models\Project;
use App\Models\ProjectAuthRefreshToken;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProjectAuthService
{
    public function __construct(
        public JwtTokenService $jwtTokenService,
        public RefreshTokenService $refreshTokenService,
        public AuthAuditEventService $auditEventService,
        public ProjectAuthEmailVerificationService $emailVerificationService
    ) {}

    public function signUp(Project $project, array $input, Request $request): array
    {
        $email = mb_strtolower(trim((string) $input['email']));

        $exists = ProjectAuthUser::query()
            ->where('project_id', $project->id)
            ->where('email', $email)
            ->exists();

        if ($exists) {
            $this->auditEventService->log(
                project: $project,
                eventType: 'auth.signup.failed',
                metadata: ['reason' => 'email_exists'],
                request: $request
            );

            throw ValidationException::withMessages([
                'email' => __('An account with this email already exists for the selected project.'),
            ]);
        }

        $authUser = ProjectAuthUser::query()->create([
            'project_id' => $project->id,
            'email' => $email,
            'password' => Hash::make((string) $input['password']),
            'display_name' => $input['display_name'] ?? null,
            'email_verified_at' => null,
            'metadata' => [],
        ]);

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.signup.success',
            metadata: ['auth_user_uuid' => $authUser->uuid],
            authUser: $authUser,
            request: $request
        );

        ProjectAuthEvent::dispatch('auth.signup.success', $project, $authUser);

        $this->emailVerificationService->issueAndSend($project, $authUser, $request, force: true);

        if ($this->requiresVerifiedEmail($project)) {
            return [
                'verification_required' => true,
                'user' => $authUser,
            ];
        }

        return $this->issueSessionTokens($project, $authUser, $request, 'auth.login.success');
    }

    public function signIn(Project $project, array $credentials, Request $request): ?array
    {
        $email = mb_strtolower(trim((string) $credentials['email']));

        $authUser = ProjectAuthUser::query()
            ->where('project_id', $project->id)
            ->where('email', $email)
            ->first();

        if (! $authUser || $authUser->suspended_at || ! $authUser->password || ! Hash::check((string) $credentials['password'], $authUser->password)) {
            $this->auditEventService->log(
                project: $project,
                eventType: 'auth.login.failed',
                metadata: ['reason' => 'invalid_credentials', 'email_hash' => sha1($email)],
                request: $request
            );

            return null;
        }

        $this->assertEmailVerifiedIfRequired($project, $authUser, $request);

        return $this->issueSessionTokens($project, $authUser, $request, 'auth.login.success');
    }

    public function refresh(Project $project, string $refreshToken, Request $request): ?array
    {
        $rotated = $this->refreshTokenService->rotate(
            project: $project,
            rawRefreshToken: $refreshToken,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );

        if (! $rotated) {
            $this->auditEventService->log(
                project: $project,
                eventType: 'auth.refresh.failed',
                metadata: ['reason' => 'invalid_refresh_token'],
                request: $request,
                riskFlags: ['refresh.invalid_or_reused']
            );

            return null;
        }

        $authUser = $rotated['auth_user'];
        $session = $rotated['session'];

        if ($this->requiresVerifiedEmail($project) && ! $authUser->email_verified_at) {
            $this->refreshTokenService->revokeSession($session);

            throw new ProjectAuthEmailVerificationRequiredException($authUser);
        }

        $accessToken = $this->jwtTokenService->issueAccessToken($project, $authUser, $session);

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.refresh.success',
            metadata: [
                'auth_user_uuid' => $authUser->uuid,
                'session_uuid' => $session->session_uuid,
            ],
            authUser: $authUser,
            session: $session,
            request: $request
        );

        return [
            'access_token' => $accessToken['token'],
            'access_token_expires_at' => $accessToken['expires_at'],
            'refresh_token' => $rotated['refresh_token'],
            'refresh_token_expires_at' => $rotated['new']->expires_at,
            'token_type' => 'Bearer',
            'user' => $authUser,
        ];
    }

    public function authenticateAccessToken(Project $project, string $token): ?array
    {
        $decoded = $this->jwtTokenService->decodeForProject($project, $token);

        if (! $decoded) {
            return null;
        }

        $payload = $decoded['payload'];

        $authUser = ProjectAuthUser::query()
            ->where('project_id', $project->id)
            ->where('uuid', $payload['sub'] ?? '')
            ->first();

        $session = ProjectAuthSession::query()
            ->where('project_id', $project->id)
            ->where('session_uuid', $payload['sid'] ?? '')
            ->first();

        if (! $authUser || $authUser->suspended_at || ! $session || $session->revoked_at || $session->expires_at->isPast()) {
            return null;
        }

        return [
            'auth_user' => $authUser,
            'session' => $session,
            'payload' => $payload,
        ];
    }

    public function logoutCurrentSession(Project $project, ProjectAuthSession $session, Request $request, ?ProjectAuthUser $authUser = null): void
    {
        $this->refreshTokenService->revokeSession($session);

        ProjectAuthEvent::dispatch('auth.logout.success', $project, $authUser);

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.logout.success',
            metadata: ['session_uuid' => $session->session_uuid],
            authUser: $authUser,
            session: $session,
            request: $request
        );
    }

    public function logoutAllSessions(Project $project, ProjectAuthUser $authUser, Request $request): void
    {
        $sessionIds = ProjectAuthSession::query()
            ->where('project_id', $project->id)
            ->where('project_auth_user_id', $authUser->id)
            ->pluck('id');

        $now = now();
        ProjectAuthSession::query()
            ->whereIn('id', $sessionIds)
            ->update(['revoked_at' => $now]);

        if ($sessionIds->isNotEmpty()) {
            ProjectAuthRefreshToken::query()
                ->whereIn('project_auth_session_id', $sessionIds)
                ->update(['revoked_at' => $now]);
        }

        ProjectAuthEvent::dispatch('auth.logout_all.success', $project, $authUser);

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.logout_all.success',
            metadata: ['auth_user_uuid' => $authUser->uuid],
            authUser: $authUser,
            request: $request
        );
    }

    public function revokeSessionsForUnverifiedUsers(Project $project): void
    {
        $userIds = ProjectAuthUser::query()
            ->where('project_id', $project->id)
            ->whereNull('email_verified_at')
            ->pluck('id');

        if ($userIds->isEmpty()) {
            return;
        }

        $now = now();

        ProjectAuthSession::query()
            ->where('project_id', $project->id)
            ->whereIn('project_auth_user_id', $userIds)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => $now]);

        ProjectAuthRefreshToken::query()
            ->where('project_id', $project->id)
            ->whereIn('project_auth_user_id', $userIds)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => $now]);
    }

    protected function issueSessionTokens(
        Project $project,
        ProjectAuthUser $authUser,
        Request $request,
        string $eventType
    ): array {
        $this->enforceSessionLimit($project, $authUser);

        $session = ProjectAuthSession::query()->create([
            'project_id' => $project->id,
            'project_auth_user_id' => $authUser->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'last_activity_at' => now(),
            'expires_at' => now()->addDays((int) config('project_auth.refresh_token_ttl_days', 30)),
        ]);

        $accessToken = $this->jwtTokenService->issueAccessToken($project, $authUser, $session);
        $refreshToken = $this->refreshTokenService->issue(
            project: $project,
            authUser: $authUser,
            session: $session,
            issuedIp: $request->ip(),
            issuedUserAgent: $request->userAgent()
        );

        $authUser->forceFill(['last_login_at' => now()])->save();

        ProjectAuthEvent::dispatch($eventType, $project, $authUser);

        $this->auditEventService->log(
            project: $project,
            eventType: $eventType,
            metadata: [
                'auth_user_uuid' => $authUser->uuid,
                'session_uuid' => $session->session_uuid,
            ],
            authUser: $authUser,
            session: $session,
            request: $request
        );

        return [
            'access_token' => $accessToken['token'],
            'access_token_expires_at' => $accessToken['expires_at'],
            'refresh_token' => $refreshToken['raw'],
            'refresh_token_expires_at' => $refreshToken['expires_at'],
            'token_type' => 'Bearer',
            'user' => $authUser,
            'session' => $session,
        ];
    }

    protected function enforceSessionLimit(Project $project, ProjectAuthUser $authUser): void
    {
        $maxSessions = (int) config('project_auth.max_sessions_per_user', 25);

        $activeSessions = ProjectAuthSession::query()
            ->where('project_id', $project->id)
            ->where('project_auth_user_id', $authUser->id)
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->orderBy('last_activity_at', 'asc')
            ->get();

        $excess = $activeSessions->count() - $maxSessions + 1;
        if ($excess <= 0) {
            return;
        }

        $toRevoke = $activeSessions->take($excess);
        $now = now();

        ProjectAuthSession::query()
            ->whereIn('id', $toRevoke->pluck('id'))
            ->update(['revoked_at' => $now]);

        ProjectAuthRefreshToken::query()
            ->whereIn('project_auth_session_id', $toRevoke->pluck('id'))
            ->whereNull('revoked_at')
            ->update(['revoked_at' => $now]);
    }

    protected function requiresVerifiedEmail(Project $project): bool
    {
        return (bool) $project->project_auth_require_verified_email;
    }

    protected function assertEmailVerifiedIfRequired(Project $project, ProjectAuthUser $authUser, Request $request): void
    {
        if (! $this->requiresVerifiedEmail($project) || $authUser->email_verified_at) {
            return;
        }

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.login.unverified_blocked',
            metadata: ['auth_user_uuid' => $authUser->uuid],
            authUser: $authUser,
            request: $request
        );

        throw new ProjectAuthEmailVerificationRequiredException($authUser);
    }
}
