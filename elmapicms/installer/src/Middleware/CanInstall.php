<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CanInstall
{
    /**
     * Block the installer wizard once the application has been installed.
     *
     * The completion page (and its "finish" action) must stay reachable right
     * after the lock file is written, so the user can see the final summary
     * and be redirected to the login page. Every other wizard step is blocked.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (file_exists(storage_path('app/installed'))) {
            $routeName = $request->route()?->getName();

            if (! in_array($routeName, ['install.complete', 'install.finish'], true)) {
                abort(404);
            }
        }

        return $next($request);
    }
}
