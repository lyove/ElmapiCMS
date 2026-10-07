<?php

namespace App\Services\Auth;

use App\Models\Project;
use App\Models\ProjectAuthApiKey;
use App\Models\ProjectAuthUser;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserApiKeyService
{
    public function __construct(public AuthAuditEventService $auditEventService) {}

    public function createKey(
        Project $project,
        ProjectAuthUser $authUser,
        string $name,
        array $scopes = [],
        ?string $expiresAt = null,
        ?Request $request = null
    ): array {
        $prefix = 'uak_'.Str::lower(Str::random(12));
        $secret = Str::random(64);
        $plainTextKey = $prefix.'_'.$secret;

        $normalizedScopes = $this->normalizeScopes($scopes);

        $apiKey = ProjectAuthApiKey::query()->create([
            'project_id' => $project->id,
            'project_auth_user_id' => $authUser->id,
            'name' => $name,
            'key_prefix' => $prefix,
            'key_hash' => $this->hash($plainTextKey),
            'scopes' => $normalizedScopes,
            'expires_at' => $expiresAt,
            'last_used_at' => null,
            'revoked_at' => null,
        ]);

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.user_api_key.created',
            metadata: [
                'auth_user_uuid' => $authUser->uuid,
                'api_key_id' => $apiKey->id,
                'api_key_prefix' => $apiKey->key_prefix,
            ],
            authUser: $authUser,
            request: $request
        );

        return [
            'plain_text_key' => $plainTextKey,
            'api_key' => $apiKey,
        ];
    }

    public function listKeys(Project $project, ProjectAuthUser $authUser)
    {
        return ProjectAuthApiKey::query()
            ->where('project_id', $project->id)
            ->where('project_auth_user_id', $authUser->id)
            ->latest('id')
            ->get();
    }

    public function revokeKey(Project $project, ProjectAuthUser $authUser, int $keyId, ?Request $request = null): bool
    {
        $key = ProjectAuthApiKey::query()
            ->where('project_id', $project->id)
            ->where('project_auth_user_id', $authUser->id)
            ->where('id', $keyId)
            ->first();

        if (! $key) {
            return false;
        }

        if (! $key->revoked_at) {
            $key->update(['revoked_at' => now()]);
        }

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.user_api_key.revoked',
            metadata: [
                'auth_user_uuid' => $authUser->uuid,
                'api_key_id' => $key->id,
                'api_key_prefix' => $key->key_prefix,
            ],
            authUser: $authUser,
            request: $request
        );

        return true;
    }

    public function updateKey(
        Project $project,
        ProjectAuthApiKey $apiKey,
        ProjectAuthUser $authUser,
        array $attributes,
        ?Request $request = null
    ): ProjectAuthApiKey {
        $updates = [];

        if (array_key_exists('project_auth_user_id', $attributes)) {
            $updates['project_auth_user_id'] = $authUser->id;
        }

        if (array_key_exists('name', $attributes)) {
            $updates['name'] = $attributes['name'];
        }

        if (array_key_exists('scopes', $attributes)) {
            $updates['scopes'] = $this->normalizeScopes(is_array($attributes['scopes']) ? $attributes['scopes'] : []);
        }

        if (array_key_exists('expires_at', $attributes)) {
            $updates['expires_at'] = $attributes['expires_at'];
        }

        if ($updates !== []) {
            $apiKey->update($updates);
        }

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.user_api_key.updated',
            metadata: [
                'auth_user_uuid' => $authUser->uuid,
                'api_key_id' => $apiKey->id,
                'api_key_prefix' => $apiKey->key_prefix,
            ],
            authUser: $authUser,
            request: $request
        );

        return $apiKey->fresh();
    }

    public function deleteKey(
        Project $project,
        ProjectAuthApiKey $apiKey,
        ProjectAuthUser $authUser,
        ?Request $request = null
    ): void {
        $keyId = $apiKey->id;
        $keyPrefix = $apiKey->key_prefix;

        $apiKey->delete();

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.user_api_key.deleted',
            metadata: [
                'auth_user_uuid' => $authUser->uuid,
                'api_key_id' => $keyId,
                'api_key_prefix' => $keyPrefix,
            ],
            authUser: $authUser,
            request: $request
        );
    }

    public function introspect(Project $project, string $rawKey, ?Request $request = null): array
    {
        $base = $this->introspectionPayload(project: $project, active: false);

        $key = ProjectAuthApiKey::query()
            ->with('authUser:id,uuid,suspended_at')
            ->where('project_id', $project->id)
            ->where('key_hash', $this->hash($rawKey))
            ->first();

        if (! $key) {
            $this->logIntrospectionDenied($project, 'not_found', $request);

            return $base;
        }

        if ($key->revoked_at) {
            $this->logIntrospectionDenied($project, 'revoked', $request, $key);

            return $this->introspectionPayload(project: $project, active: false, apiKey: $key);
        }

        if ($key->expires_at && $key->expires_at->isPast()) {
            $this->logIntrospectionDenied($project, 'expired', $request, $key);

            return $this->introspectionPayload(project: $project, active: false, apiKey: $key);
        }

        if ($key->authUser?->suspended_at) {
            $this->logIntrospectionDenied($project, 'user_suspended', $request, $key);

            return $this->introspectionPayload(project: $project, active: false, apiKey: $key);
        }

        $key->update(['last_used_at' => now()]);

        return $this->introspectionPayload(project: $project, active: true, apiKey: $key);
    }

    protected function hash(string $value): string
    {
        return hash('sha256', $value);
    }

    protected function normalizeScopes(array $scopes): array
    {
        return array_values(array_unique(array_filter(
            array_map(static fn ($scope): string => trim((string) $scope), $scopes),
            static fn (string $scope): bool => $scope !== ''
        )));
    }

    protected function logIntrospectionDenied(Project $project, string $reason, ?Request $request = null, ?ProjectAuthApiKey $apiKey = null): void
    {
        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.user_api_key.introspection.denied',
            metadata: array_filter([
                'reason' => $reason,
                'api_key_id' => $apiKey?->id,
                'api_key_prefix' => $apiKey?->key_prefix,
            ]),
            authUser: $apiKey?->authUser,
            request: $request
        );
    }

    protected function introspectionPayload(Project $project, bool $active, ?ProjectAuthApiKey $apiKey = null): array
    {
        return [
            'active' => $active,
            'project_uuid' => $project->uuid,
            'user_uuid' => $active ? $apiKey?->authUser?->uuid : null,
            'scopes' => $active && is_array($apiKey?->scopes) ? $apiKey->scopes : [],
            'expires_at' => $apiKey?->expires_at?->toIso8601String(),
            'key_id' => $apiKey?->id,
            'key_prefix' => $apiKey?->key_prefix,
        ];
    }
}
