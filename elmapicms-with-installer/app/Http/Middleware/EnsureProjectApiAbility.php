<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProjectApiAbility
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        $principalType = $request->attributes->get('api_principal_type');
        $project = $request->attributes->get('project');

        // Keep Elmapi public_api reads working for unauthenticated and weak-token clients.
        if ($ability === 'read' && $project?->public_api) {
            return $next($request);
        }

        if ($principalType === 'public') {
            if ($ability === 'read') {
                return $next($request);
            }

            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($principalType === 'project_token') {
            $token = $request->attributes->get('project_api_token') ?: auth('sanctum')->user()?->currentAccessToken();

            if ($token && ($token->can($ability) || $token->can('*'))) {
                return $next($request);
            }

            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Project Auth JWTs are identity-only; CMS API access uses Sanctum project tokens
        // (and later per-user API keys). Keep public_api reads above.
        if ($principalType === 'project_auth_user') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(['message' => 'Forbidden.'], 403);
    }
}
