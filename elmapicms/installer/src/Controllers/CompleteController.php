<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Controllers;

use ElmapiCMS\Installer\Services\EnvironmentManager;
use ElmapiCMS\Installer\Services\InstalledFileManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\View\View;
use Throwable;

final class CompleteController
{
    public function __construct(private readonly EnvironmentManager $environment) {}
    public function show(): View|RedirectResponse
    {
        $done = (array) session('_installer_done', []);

        if ($done === []) {
            if (InstalledFileManager::installed()) {
                return view('installer::locked', [
                    'basePath' => base_path(),
                    'appUrl' => request()->getSchemeAndHttpHost(),
                ]);
            }

            return redirect()->route('install.requirements');
        }

        return view('installer::complete', [
            'done' => $done,
            'log' => (array) session('_installer_log', []),
        ]);
    }

    public function finish(Request $request): RedirectResponse
    {
        $appUrl = (string) session('_installer_done.app_url', $request->getSchemeAndHttpHost());

        // The lock and the session/queue/cache driver flip are deferred to here
        // (not InstallerService::run) so the completion page can still read the
        // file-backed session that holds the wizard state. Only finalize when
        // this session actually ran the installer.
        if (session()->has('_installer_done')) {
            $this->environment->finalizeDrivers();
            InstalledFileManager::write($appUrl);

            try {
                Artisan::call('config:clear');
                Artisan::call('route:clear');
                Artisan::call('view:clear');
            } catch (Throwable) {
                // Non-fatal
            }
        }

        session()->forget('_installer_done');
        session()->forget('_installer_log');
        session()->forget('_installer_config');

        // In the package layout there is nothing to delete from public/ — the
        // CanInstall middleware already turns every /install route into a 404.
        return redirect()->away(rtrim($appUrl, '/').'/login');
    }
}
