<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer;

use ElmapiCMS\Installer\Middleware\CanInstall;
use Illuminate\Routing\Router;
use Illuminate\Support\ServiceProvider;

final class InstallerServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->loadRoutesFrom(__DIR__.'/Routes/web.php');
    }

    public function boot(Router $router): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'installer');

        $router->middlewareGroup('install', [CanInstall::class]);
    }
}
