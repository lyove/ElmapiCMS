<?php

namespace App\Http\Middleware;

use App\Services\Auth\ProjectAuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveProjectAuthUser
{
    public function __construct(public ProjectAuthService $projectAuthService) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $optional = 'false'): Response
    {
        if ($request->attributes->get('project_auth_user')) {
            return $next($request);
        }

        $project = $request->attributes->get('project');
        $bearer = $request->bearerToken();
        $isOptional = $optional === 'true';

        if (! $project || ! $bearer) {
            if ($isOptional) {
                return $next($request);
            }

            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $context = $this->projectAuthService->authenticateAccessToken($project, $bearer);

        if (! $context) {
            if ($isOptional) {
                return $next($request);
            }

            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $request->attributes->set('project_auth_user', $context['auth_user']);
        $request->attributes->set('project_auth_session', $context['session']);
        $request->attributes->set('api_principal_type', 'project_auth_user');

        return $next($request);
    }
}
