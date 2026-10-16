<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Services\Auth\ProjectAuthService;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class ProjectAccess
{
    public function __construct(public ProjectAuthService $projectAuthService) {}

    /**
     * Resolve project from header and enforce API access permissions.
     *
     * Expects header: project-id
     */
    public function handle(Request $request, Closure $next): Response
    {
        $uuid = $request->header('project-id');

        if (! $uuid) {
            return response()->json(['message' => 'Project header missing.'], 400);
        }

        $project = Project::where('uuid', $uuid)->first();

        if (! $project) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        // Share the resolved project for downstream usage
        $request->attributes->set('project', $project);

        if ($this->isPublicAuthRoute($request)) {
            return $next($request);
        }

        if (auth('sanctum')->check()) {
            $tokenable = auth('sanctum')->user();
            $currentToken = auth('sanctum')->user()?->currentAccessToken();

            if ($tokenable instanceof Project && $tokenable->id === $project->id) {
                $request->attributes->set('api_principal_type', 'project_token');
                $request->attributes->set('project_api_token', $currentToken);

                return $next($request);
            }
        }

        $bearer = $request->bearerToken();
        if ($bearer && str_starts_with($bearer, 'uak_')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($bearer) {
            $personalAccessToken = PersonalAccessToken::findToken($bearer);

            if ($personalAccessToken && $personalAccessToken->tokenable_type === Project::class) {
                $tokenProject = $personalAccessToken->tokenable;

                if ($tokenProject instanceof Project && $tokenProject->id === $project->id) {
                    $request->attributes->set('api_principal_type', 'project_token');
                    $request->attributes->set('project_api_token', $personalAccessToken);

                    return $next($request);
                }
            }
        }

        if ($bearer) {
            $context = $this->projectAuthService->authenticateAccessToken($project, $bearer);

            if ($context) {
                $request->attributes->set('project_auth_user', $context['auth_user']);
                $request->attributes->set('project_auth_session', $context['session']);
                $request->attributes->set('api_principal_type', 'project_auth_user');

                return $next($request);
            }
        }

        if (! $project->public_api) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $request->attributes->set('api_principal_type', 'public');

        return $next($request);
    }

    protected function isPublicAuthRoute(Request $request): bool
    {
        return $request->routeIs([
            'api.auth.signup',
            'api.auth.login',
            'api.auth.refresh',
            'api.auth.verify_email.resend',
            'api.auth.verify_email.confirm',
        ]);
    }
}
