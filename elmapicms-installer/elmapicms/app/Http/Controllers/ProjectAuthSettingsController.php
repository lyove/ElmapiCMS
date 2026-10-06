<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectAuthApiKey;
use App\Models\ProjectAuthAuditEvent;
use App\Models\ProjectAuthRefreshToken;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use App\Services\Auth\ProjectAuthEmailVerificationService;
use App\Services\Auth\ProjectAuthService;
use App\Services\Auth\UserApiKeyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectAuthSettingsController extends Controller
{
    public function __construct(
        public UserApiKeyService $userApiKeyService,
        public ProjectAuthService $projectAuthService,
        public ProjectAuthEmailVerificationService $emailVerificationService
    ) {}

    public function index(Project $project): Response
    {
        $totalUsers = $project->authUsers()->count();
        $verifiedUsers = $project->authUsers()->whereNotNull('email_verified_at')->count();
        $unverifiedUsers = $project->authUsers()->whereNull('email_verified_at')->count();
        $suspendedUsers = $project->authUsers()->whereNotNull('suspended_at')->count();
        $activeSessions = $project->authSessions()->whereNull('revoked_at')->where('expires_at', '>', now())->count();
        $totalSessions = $project->authSessions()->count();
        $activeApiKeys = ProjectAuthApiKey::query()
            ->where('project_id', $project->id)
            ->whereNull('revoked_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->count();

        return Inertia::render('Projects/Settings/Auth/Index', [
            'project' => $project,
            'stats' => [
                'total_users' => $totalUsers,
                'verified_users' => $verifiedUsers,
                'unverified_users' => $unverifiedUsers,
                'suspended_users' => $suspendedUsers,
                'active_sessions' => $activeSessions,
                'total_sessions' => $totalSessions,
                'active_api_keys' => $activeApiKeys,
            ],
            'authSettings' => [
                'require_verified_email' => (bool) $project->project_auth_require_verified_email,
                'verification_email' => $this->emailVerificationService->resolvedMailConfig($project),
            ],
        ]);
    }

    public function usersPage(Project $project): Response
    {
        return Inertia::render('Projects/Settings/Auth/Users', [
            'project' => $project,
        ]);
    }

    public function sessionsPage(Project $project): Response
    {
        return Inertia::render('Projects/Settings/Auth/Sessions', [
            'project' => $project,
        ]);
    }

    public function apiKeysPage(Project $project): Response
    {
        return Inertia::render('Projects/Settings/Auth/ApiKeys', [
            'project' => $project,
        ]);
    }

    public function auditPage(Project $project): Response
    {
        return Inertia::render('Projects/Settings/Auth/AuditLog', [
            'project' => $project,
        ]);
    }

    public function emailVerificationPage(Project $project): Response
    {
        return Inertia::render('Projects/Settings/Auth/EmailVerification', [
            'project' => $project,
            'authSettings' => [
                'require_verified_email' => (bool) $project->project_auth_require_verified_email,
                'verification_email' => $this->emailVerificationService->resolvedMailConfig($project),
            ],
        ]);
    }

    public function settingsUpdate(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'require_verified_email' => ['required', 'boolean'],
            'verification_email.subject' => ['nullable', 'string', 'max:255'],
            'verification_email.heading' => ['nullable', 'string', 'max:255'],
            'verification_email.intro' => ['nullable', 'string', 'max:2000'],
            'verification_email.button_text' => ['nullable', 'string', 'max:120'],
            'verification_email.outro' => ['nullable', 'string', 'max:2000'],
            'verification_email.from_name' => ['nullable', 'string', 'max:255'],
            'verification_email.from_email' => ['nullable', 'email', 'max:255'],
            'verification_email.verification_url_base' => ['nullable', 'url:http,https', 'max:500'],
        ]);

        $wasStrict = (bool) $project->project_auth_require_verified_email;
        $isStrict = (bool) $validated['require_verified_email'];

        $emailConfig = array_filter(
            $validated['verification_email'] ?? [],
            fn ($value) => is_string($value) ? trim($value) !== '' : $value !== null
        );

        $project->update([
            'project_auth_require_verified_email' => $isStrict,
            'project_auth_email_verification_config' => $emailConfig,
        ]);

        if (! $wasStrict && $isStrict) {
            $this->projectAuthService->revokeSessionsForUnverifiedUsers($project);
        }

        return response()->json([
            'require_verified_email' => (bool) $project->project_auth_require_verified_email,
            'verification_email' => $this->emailVerificationService->resolvedMailConfig($project),
        ]);
    }

    /* ----- Users ----- */

    public function usersIndex(Project $project): JsonResponse
    {
        $users = $project->authUsers()
            ->withCount(['sessions' => function ($q) {
                $q->whereNull('revoked_at')->where('expires_at', '>', now());
            }])
            ->latest()
            ->paginate(50);

        return response()->json($users);
    }

    public function usersStore(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', Rule::unique('project_auth_users')->where('project_id', $project->id)->whereNull('deleted_at')],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'display_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $project->authUsers()->create([
            'email' => mb_strtolower(trim($validated['email'])),
            'password' => Hash::make($validated['password']),
            'display_name' => $validated['display_name'] ?? null,
            'email_verified_at' => now(),
            'metadata' => [],
        ]);

        return response()->json($user, 201);
    }

    public function usersUpdate(Request $request, Project $project, ProjectAuthUser $authUser): JsonResponse
    {
        if ($authUser->project_id !== $project->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'display_name' => ['nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('project_auth_users')->where('project_id', $project->id)->whereNull('deleted_at')->ignore($authUser->id)],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
            'suspended' => ['nullable', 'boolean'],
            'verified' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['email'])) {
            $authUser->email = mb_strtolower(trim($validated['email']));
        }

        if (isset($validated['display_name'])) {
            $authUser->display_name = $validated['display_name'];
        }

        if (! empty($validated['password'])) {
            $authUser->password = Hash::make($validated['password']);
        }

        if (isset($validated['suspended'])) {
            $authUser->suspended_at = $validated['suspended'] ? now() : null;
        }

        if (isset($validated['verified'])) {
            $authUser->email_verified_at = $validated['verified'] ? now() : null;
        }

        $authUser->save();

        if (($validated['suspended'] ?? false) === true) {
            $this->revokeUserSessions($project, $authUser);

            $activeKeys = $this->userApiKeyService->listKeys($project, $authUser)
                ->filter(fn (ProjectAuthApiKey $apiKey): bool => $apiKey->revoked_at === null);

            foreach ($activeKeys as $apiKey) {
                $this->userApiKeyService->revokeKey(
                    project: $project,
                    authUser: $authUser,
                    keyId: $apiKey->id,
                    request: $request
                );
            }
        }

        if (($validated['verified'] ?? true) === false && (bool) $project->project_auth_require_verified_email) {
            $this->revokeUserSessions($project, $authUser);
        }

        return response()->json($authUser->fresh());
    }

    public function usersResendVerification(Request $request, Project $project, ProjectAuthUser $authUser): JsonResponse
    {
        if ($authUser->project_id !== $project->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if ($authUser->suspended_at) {
            return response()->json(['message' => 'User is suspended.'], 422);
        }

        if ($authUser->email_verified_at) {
            return response()->json(['message' => 'User is already verified.'], 422);
        }

        $this->emailVerificationService->issueAndSend($project, $authUser, $request, force: true);

        return response()->json(['message' => 'Verification email sent.']);
    }

    public function usersDestroy(Project $project, ProjectAuthUser $authUser): JsonResponse
    {
        if ($authUser->project_id !== $project->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $this->snapshotDeletedUserAuditContext($project, $authUser);

        $this->revokeUserSessions($project, $authUser);

        $userApiKeys = $this->userApiKeyService->listKeys($project, $authUser);
        foreach ($userApiKeys as $apiKey) {
            $this->userApiKeyService->deleteKey(
                project: $project,
                apiKey: $apiKey,
                authUser: $authUser
            );
        }

        $authUser->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    /* ----- Sessions ----- */

    public function sessionsIndex(Project $project): JsonResponse
    {
        $sessions = ProjectAuthSession::query()
            ->with('authUser:id,uuid,email,display_name')
            ->where('project_id', $project->id)
            ->whereHas('authUser')
            ->latest()
            ->paginate(50);

        return response()->json($sessions);
    }

    public function sessionsRevoke(Project $project, ProjectAuthSession $session): JsonResponse
    {
        if ($session->project_id !== $project->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $session->update(['revoked_at' => now()]);

        ProjectAuthRefreshToken::query()
            ->where('project_auth_session_id', $session->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        return response()->json(['message' => 'Session revoked.']);
    }

    /* ----- Audit Log ----- */

    public function auditIndex(Request $request, Project $project): JsonResponse
    {
        $query = ProjectAuthAuditEvent::query()
            ->with('authUser:id,uuid,email,display_name')
            ->where('project_id', $project->id)
            ->latest('occurred_at');

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->input('event_type'));
        }

        if ($request->filled('auth_user_id')) {
            $query->where('project_auth_user_id', $request->input('auth_user_id'));
        }

        $events = $query->paginate(50);
        $events->getCollection()->transform(function (ProjectAuthAuditEvent $event): array {
            $payload = $event->toArray();
            $payload['deleted_user_email'] = data_get($payload, 'metadata.deleted_user_email');

            return $payload;
        });

        return response()->json($events);
    }

    /* ----- User API Keys ----- */

    public function apiKeysIndex(Project $project): JsonResponse
    {
        $keys = ProjectAuthApiKey::query()
            ->with('authUser:id,uuid,email,display_name')
            ->where('project_id', $project->id)
            ->latest('id')
            ->paginate(50);

        return response()->json($keys);
    }

    public function apiKeysStore(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'project_auth_user_id' => ['required', 'integer'],
            'name' => ['required', 'string', 'max:255'],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['string', 'max:100'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $authUser = ProjectAuthUser::query()
            ->where('project_id', $project->id)
            ->where('id', $validated['project_auth_user_id'])
            ->first();

        if (! $authUser) {
            return response()->json(['message' => 'Project auth user not found.'], 404);
        }

        $created = $this->userApiKeyService->createKey(
            project: $project,
            authUser: $authUser,
            name: $validated['name'],
            scopes: $validated['scopes'] ?? [],
            expiresAt: $validated['expires_at'] ?? null,
            request: $request
        );

        return response()->json([
            'id' => $created['api_key']->id,
            'name' => $created['api_key']->name,
            'key_prefix' => $created['api_key']->key_prefix,
            'scopes' => $created['api_key']->scopes ?? [],
            'expires_at' => $created['api_key']->expires_at,
            'created_at' => $created['api_key']->created_at,
            'plain_text_key' => $created['plain_text_key'],
            'project_auth_user_id' => $created['api_key']->project_auth_user_id,
        ], 201);
    }

    public function apiKeysRevoke(Project $project, ProjectAuthApiKey $apiKey, Request $request): JsonResponse
    {
        if ($apiKey->project_id !== $project->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $authUser = ProjectAuthUser::query()
            ->withTrashed()
            ->where('project_id', $project->id)
            ->where('id', $apiKey->project_auth_user_id)
            ->first();

        if (! $authUser) {
            return response()->json(['message' => 'Project auth user not found.'], 404);
        }

        $this->userApiKeyService->revokeKey(
            project: $project,
            authUser: $authUser,
            keyId: $apiKey->id,
            request: $request
        );

        return response()->json(['message' => 'API key revoked.']);
    }

    public function apiKeysUpdate(Request $request, Project $project, ProjectAuthApiKey $apiKey): JsonResponse
    {
        if ($apiKey->project_id !== $project->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'project_auth_user_id' => ['sometimes', 'integer'],
            'name' => ['sometimes', 'string', 'max:255'],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['string', 'max:100'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $authUser = ProjectAuthUser::query()
            ->where('project_id', $project->id)
            ->where('id', $validated['project_auth_user_id'] ?? $apiKey->project_auth_user_id)
            ->first();

        if (! $authUser) {
            return response()->json(['message' => 'Project auth user not found.'], 404);
        }

        $updated = $this->userApiKeyService->updateKey(
            project: $project,
            apiKey: $apiKey,
            authUser: $authUser,
            attributes: $validated,
            request: $request
        );

        return response()->json([
            'id' => $updated->id,
            'project_auth_user_id' => $updated->project_auth_user_id,
            'name' => $updated->name,
            'key_prefix' => $updated->key_prefix,
            'scopes' => $updated->scopes ?? [],
            'expires_at' => $updated->expires_at,
            'last_used_at' => $updated->last_used_at,
            'revoked_at' => $updated->revoked_at,
            'created_at' => $updated->created_at,
        ]);
    }

    public function apiKeysDestroy(Project $project, ProjectAuthApiKey $apiKey, Request $request): JsonResponse
    {
        if ($apiKey->project_id !== $project->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if (! $apiKey->revoked_at) {
            return response()->json(['message' => 'Only revoked API keys can be deleted.'], 422);
        }

        $authUser = ProjectAuthUser::query()
            ->withTrashed()
            ->where('project_id', $project->id)
            ->where('id', $apiKey->project_auth_user_id)
            ->first();

        if (! $authUser) {
            return response()->json(['message' => 'Project auth user not found.'], 404);
        }

        $this->userApiKeyService->deleteKey(
            project: $project,
            apiKey: $apiKey,
            authUser: $authUser,
            request: $request
        );

        return response()->json(['message' => 'API key deleted.']);
    }

    protected function revokeUserSessions(Project $project, ProjectAuthUser $authUser): void
    {
        $now = now();

        ProjectAuthSession::query()
            ->where('project_id', $project->id)
            ->where('project_auth_user_id', $authUser->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => $now]);

        ProjectAuthRefreshToken::query()
            ->where('project_id', $project->id)
            ->where('project_auth_user_id', $authUser->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => $now]);
    }

    protected function snapshotDeletedUserAuditContext(Project $project, ProjectAuthUser $authUser): void
    {
        $deletedAt = now()->toIso8601String();

        $events = ProjectAuthAuditEvent::query()
            ->where('project_id', $project->id)
            ->where('project_auth_user_id', $authUser->id)
            ->get();

        foreach ($events as $event) {
            $metadata = is_array($event->metadata) ? $event->metadata : [];

            $metadata['deleted_user_email'] = $authUser->email;
            $metadata['deleted_user_display_name'] = $authUser->display_name;
            $metadata['deleted_user_uuid'] = $authUser->uuid;
            $metadata['deleted_user_at'] = $deletedAt;

            $event->metadata = $metadata;
            $event->save();
        }
    }
}
