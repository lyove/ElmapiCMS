<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Controllers;

use ElmapiCMS\Installer\Services\InstallerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Throwable;

final class InstallController
{
    public function __construct(private readonly InstallerService $service) {}

    /**
     * GET /install/run — show the progress page that auto-submits.
     */
    public function show(Request $request): View|RedirectResponse
    {
        $config = (array) session('_installer_config', []);

        if ($config === []) {
            return redirect()->route('install.configure');
        }

        return view('installer::installing', [
            'basePath' => base_path(),
        ]);
    }

    /**
     * POST /install/run — actually run the installation.
     */
    public function run(Request $request): View|RedirectResponse
    {
        $config = (array) session('_installer_config', []);

        if ($config === []) {
            return redirect()->route('install.configure');
        }

        try {
            $log = $this->service->run($config);

            session()->put('_installer_done', [
                'app_url' => rtrim($config['app_url'], '/'),
                'admin_email' => $config['admin_email'],
                'base_path' => base_path(),
                'cron' => $this->service->cronCommand(),
            ]);
            session()->put('_installer_log', $log);
            session()->forget('_installer_config');

            return redirect()->route('install.complete');
        } catch (Throwable $e) {
            return view('installer::error', [
                'message' => $e->getMessage(),
                'log' => (array) session('_installer_log', []),
            ]);
        }
    }
}
