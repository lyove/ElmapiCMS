<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RedirectIfNotInstalled
{
    /**
     * Until the application is installed, send every non-installer request
     * to the wizard. API requests are rejected with 404 instead.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Keep the existing test-suite behaviour untouched.
        if (app()->runningUnitTests()) {
            return $next($request);
        }

        $installed = file_exists(storage_path('app/installed'));

        // Installed + installer route: reject at the outermost layer, before
        // any database-dependent middleware (e.g. Inertia) gets a chance to
        // run. CanInstall remains as defence in depth on the route group.
        // The completion page and its "finish" action stay reachable so the
        // user can see the final summary right after the lock is written.
        // Note: as a global prepended middleware this runs before route
        // matching, so $request->route() is not available yet — match on path.
        if ($installed && $request->is('install*')) {
            $path = $request->path();

            if (! in_array($path, ['install/complete', 'install/finish'], true)) {
                abort(404);
            }
        }

        if ($installed) {
            return $next($request);
        }

        // The wizard itself and the framework health check stay reachable.
        if ($request->is('install*') || $request->is('up')) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            abort(404);
        }

        return redirect()->guest('/install');
    }
}
