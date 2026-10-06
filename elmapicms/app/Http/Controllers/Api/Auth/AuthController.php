<?php

namespace App\Http\Controllers\Api\Auth;

use App\Exceptions\ProjectAuthEmailVerificationRequiredException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Auth\ConfirmVerificationEmailRequest;
use App\Http\Requests\Api\Auth\RefreshTokenRequest;
use App\Http\Requests\Api\Auth\ResendVerificationEmailRequest;
use App\Http\Requests\Api\Auth\SignInRequest;
use App\Http\Requests\Api\Auth\SignUpRequest;
use App\Services\Auth\AuthAuditEventService;
use App\Services\Auth\ProjectAuthEmailVerificationService;
use App\Services\Auth\ProjectAuthService;
use App\Services\Auth\UserApiKeyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    public function __construct(
        public ProjectAuthService $projectAuthService,
        public AuthAuditEventService $auditEventService,
        public UserApiKeyService $userApiKeyService,
        public ProjectAuthEmailVerificationService $emailVerificationService
    ) {}

    public function signUp(SignUpRequest $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $result = $this->projectAuthService->signUp($project, $request->validated(), $request);

        if (($result['verification_required'] ?? false) === true) {
            return response()->json([
                'message' => 'Email verification required.',
                'code' => 'email_verification_required',
                'verification_required' => true,
                'user' => [
                    'id' => $result['user']->id,
                    'uuid' => $result['user']->uuid,
                    'email' => $result['user']->email,
                    'display_name' => $result['user']->display_name,
                    'email_verified_at' => $result['user']->email_verified_at,
                    'metadata' => $result['user']->metadata ?? [],
                ],
            ], 202);
        }

        return response()->json($this->tokenPayload($result), 201);
    }

    public function signIn(SignInRequest $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $email = mb_strtolower(trim((string) $request->string('email')));
        $attemptKey = $this->attemptKey($project->uuid, $email, (string) $request->ip());
        $maxAttempts = (int) config('project_auth.max_failed_signins_before_lockout', 5);
        $lockoutSeconds = (int) config('project_auth.signin_lockout_seconds', 300);

        if (RateLimiter::tooManyAttempts($attemptKey, $maxAttempts)) {
            $this->auditEventService->log(
                project: $project,
                eventType: 'auth.login.locked',
                metadata: ['email_hash' => sha1($email)],
                request: $request,
                riskFlags: ['signin.lockout']
            );

            return response()->json([
                'message' => 'Invalid credentials.',
                'retry_after' => RateLimiter::availableIn($attemptKey),
            ], 429);
        }

        try {
            $result = $this->projectAuthService->signIn($project, $request->validated(), $request);
        } catch (ProjectAuthEmailVerificationRequiredException $e) {
            $this->emailVerificationService->issueAndSend($project, $e->authUser, $request);

            return $this->emailVerificationRequiredResponse();
        }

        if (! $result) {
            RateLimiter::hit($attemptKey, $lockoutSeconds);

            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        RateLimiter::clear($attemptKey);

        return response()->json($this->tokenPayload($result));
    }

    public function refresh(RefreshTokenRequest $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        try {
            $result = $this->projectAuthService->refresh($project, (string) $request->input('refresh_token'), $request);
        } catch (ProjectAuthEmailVerificationRequiredException $e) {
            $this->emailVerificationService->issueAndSend($project, $e->authUser, $request);

            return $this->emailVerificationRequiredResponse();
        }

        if (! $result) {
            return response()->json(['message' => 'Invalid refresh token.'], 401);
        }

        return response()->json($this->tokenPayload($result));
    }

    public function resendVerificationEmail(ResendVerificationEmailRequest $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $validated = $request->validated();

        $this->emailVerificationService->resendForEmail(
            project: $project,
            email: (string) $validated['email'],
            request: $request
        );

        return response()->json([
            'message' => 'If the account exists and is unverified, a verification email has been sent.',
        ]);
    }

    public function confirmVerificationEmail(ConfirmVerificationEmailRequest $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $validated = $request->validated();

        $authUser = $this->emailVerificationService->confirmByToken(
            project: $project,
            rawToken: (string) $validated['token'],
            request: $request
        );

        if (! $authUser) {
            return response()->json([
                'message' => 'Invalid or expired verification token.',
            ], 422);
        }

        return response()->json([
            'message' => 'Email verified.',
            'user' => [
                'id' => $authUser->id,
                'uuid' => $authUser->uuid,
                'email' => $authUser->email,
                'display_name' => $authUser->display_name,
                'email_verified_at' => $authUser->email_verified_at,
                'metadata' => $authUser->metadata ?? [],
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('project_auth_user');

        if (! $authUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json([
            'user' => [
                'id' => $authUser->id,
                'uuid' => $authUser->uuid,
                'email' => $authUser->email,
                'display_name' => $authUser->display_name,
                'email_verified_at' => $authUser->email_verified_at,
                'metadata' => $authUser->metadata ?? [],
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $authUser = $request->attributes->get('project_auth_user');
        $session = $request->attributes->get('project_auth_session');

        if (! $authUser || ! $session) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $this->projectAuthService->logoutCurrentSession($project, $session, $request, $authUser);

        return response()->json(['message' => 'Logged out.']);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $authUser = $request->attributes->get('project_auth_user');

        if (! $authUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $this->projectAuthService->logoutAllSessions($project, $authUser, $request);

        return response()->json(['message' => 'Logged out from all sessions.']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $authUser = $request->attributes->get('project_auth_user');
        $project = $request->attributes->get('project');

        if (! $authUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:255', 'different:current_password'],
        ]);

        if (! $authUser->password || ! Hash::check($validated['current_password'], $authUser->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $authUser->update(['password' => Hash::make($validated['new_password'])]);

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.password.changed',
            metadata: ['auth_user_uuid' => $authUser->uuid],
            authUser: $authUser,
            request: $request
        );

        return response()->json(['message' => 'Password changed.']);
    }

    public function listApiKeys(Request $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $authUser = $request->attributes->get('project_auth_user');

        if (! $authUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $keys = $this->userApiKeyService->listKeys($project, $authUser);

        return response()->json([
            'data' => $keys->map(fn ($key) => [
                'id' => $key->id,
                'name' => $key->name,
                'key_prefix' => $key->key_prefix,
                'scopes' => $key->scopes ?? [],
                'expires_at' => $key->expires_at,
                'last_used_at' => $key->last_used_at,
                'revoked_at' => $key->revoked_at,
                'created_at' => $key->created_at,
            ]),
        ]);
    }

    public function createApiKey(Request $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $authUser = $request->attributes->get('project_auth_user');

        if (! $authUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['string', 'max:100'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

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
        ], 201);
    }

    public function revokeApiKey(Request $request, int $keyId): JsonResponse
    {
        $project = $request->attributes->get('project');
        $authUser = $request->attributes->get('project_auth_user');

        if (! $authUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $revoked = $this->userApiKeyService->revokeKey($project, $authUser, $keyId, $request);

        if (! $revoked) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json(['message' => 'API key revoked.']);
    }

    public function introspectApiKey(Request $request): JsonResponse
    {
        $project = $request->attributes->get('project');
        $validated = $request->validate([
            'api_key' => ['required', 'string', 'min:20'],
        ]);

        $result = $this->userApiKeyService->introspect(
            project: $project,
            rawKey: (string) $validated['api_key'],
            request: $request
        );

        return response()->json($result);
    }

    protected function tokenPayload(array $result): array
    {
        return [
            'access_token' => $result['access_token'],
            'token_type' => $result['token_type'],
            'expires_at' => $result['access_token_expires_at'],
            'refresh_token' => $result['refresh_token'] ?? null,
            'refresh_token_expires_at' => $result['refresh_token_expires_at'] ?? null,
            'user' => [
                'id' => $result['user']->id,
                'uuid' => $result['user']->uuid,
                'email' => $result['user']->email,
                'display_name' => $result['user']->display_name,
                'email_verified_at' => $result['user']->email_verified_at,
                'metadata' => $result['user']->metadata ?? [],
            ],
        ];
    }

    protected function attemptKey(string $projectUuid, string $email, string $ipAddress): string
    {
        return 'project-auth:signin:'.sha1($projectUuid.'|'.$email.'|'.$ipAddress);
    }

    protected function emailVerificationRequiredResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Email verification is required.',
            'code' => 'email_verification_required',
            'verification_required' => true,
        ], 403);
    }
}
