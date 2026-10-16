<?php

use App\Http\Middleware\EnsureProjectApiAbility;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ProjectAccess;
use App\Http\Middleware\ResolveProjectAuthUser;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

/*
|--------------------------------------------------------------------------
| Pre-boot installer bootstrap
|--------------------------------------------------------------------------
| Until storage/app/installed exists the application is not installed yet.
| Laravel refuses to boot without a .env, so during that window we prepare
| one from .env.example (with an APP_KEY) and force file/sync/file drivers
| so session, cache and queue never touch database tables that do not exist
| yet. The web installer rewrites .env with real credentials at configure
| time and flips the drivers back after migrations have run.
*/

$installerBasePath = dirname(__DIR__);
$installerEnvFile = $installerBasePath.'/.env';
$installerInstalledFile = $installerBasePath.'/storage/app/installed';
$installerAppEnv = (string) (getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? ''));

if ($installerAppEnv !== 'testing' && ! file_exists($installerInstalledFile)) {
    if (! file_exists($installerEnvFile) && file_exists($installerBasePath.'/.env.example')) {
        copy($installerBasePath.'/.env.example', $installerEnvFile);
    }

    if (file_exists($installerEnvFile)) {
        $installerEnvContent = (string) file_get_contents($installerEnvFile);

        $installerEnvContent = preg_replace(
            '/^SESSION_DRIVER=.*$/m',
            'SESSION_DRIVER=file',
            $installerEnvContent
        ) ?? $installerEnvContent;
        $installerEnvContent = preg_replace(
            '/^QUEUE_CONNECTION=.*$/m',
            'QUEUE_CONNECTION=sync',
            $installerEnvContent
        ) ?? $installerEnvContent;
        $installerEnvContent = preg_replace(
            '/^CACHE_STORE=.*$/m',
            'CACHE_STORE=file',
            $installerEnvContent
        ) ?? $installerEnvContent;

        if (! preg_match('/^APP_KEY=.+/m', $installerEnvContent)) {
            $installerKey = 'base64:'.base64_encode(random_bytes(32));
            $installerEnvContent = preg_replace(
                '/^APP_KEY=.*$/m',
                'APP_KEY='.$installerKey,
                $installerEnvContent
            ) ?? $installerEnvContent;
        }

        if (file_put_contents($installerEnvFile, $installerEnvContent) === false) {
            throw new RuntimeException('Could not prepare .env for installation.');
        }
    }
}

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prepend(\ElmapiCMS\Installer\Middleware\RedirectIfNotInstalled::class);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'project' => ProjectAccess::class,
            'project.auth_user' => ResolveProjectAuthUser::class,
            'project.ability' => EnsureProjectApiAbility::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
