<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Controllers;

use ElmapiCMS\Installer\Services\EnvironmentManager;
use ElmapiCMS\Installer\Services\RequirementsChecker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Throwable;

final class ConfigureController
{
    public function __construct(
        private readonly RequirementsChecker $checker,
        private readonly EnvironmentManager $environment,
    ) {}

    public function show(Request $request): View|RedirectResponse
    {
        if (! $this->checker->allPassed($this->checker->check(base_path()))) {
            return redirect()->route('install.requirements');
        }

        $old = (array) session()->pull('_installer_old', []);
        $errors = (array) session()->pull('_installer_errors', []);

        return view('installer::configure', [
            'old' => array_merge([
                'app_url' => $request->getSchemeAndHttpHost(),
                'db_host' => 'localhost',
                'db_port' => '3306',
                'db_database' => '',
                'db_username' => '',
                'db_password' => '',
                'admin_name' => 'Admin',
                'admin_email' => '',
                'admin_password' => '',
                'admin_password_confirmation' => '',
            ], $old),
            'errors' => $errors,
        ]);
    }

    public function save(Request $request): RedirectResponse
    {
        $input = [
            'app_url' => trim((string) $request->input('app_url', '')),
            'db_host' => trim((string) $request->input('db_host', '')),
            'db_port' => trim((string) $request->input('db_port', '3306')),
            'db_database' => trim((string) $request->input('db_database', '')),
            'db_username' => trim((string) $request->input('db_username', '')),
            'db_password' => (string) $request->input('db_password', ''),
            'admin_name' => trim((string) $request->input('admin_name', 'Admin')),
            'admin_email' => trim((string) $request->input('admin_email', '')),
            'admin_password' => (string) $request->input('admin_password', ''),
            'admin_password_confirmation' => (string) $request->input('admin_password_confirmation', ''),
        ];

        $errors = $this->environment->validate($input);

        if ($errors === []) {
            try {
                $this->environment->testConnection($input);
            } catch (Throwable $e) {
                $errors['db'] = 'Database connection failed: '.$e->getMessage();
            }
        }

        if ($errors !== []) {
            session()->flash('_installer_old', $input);
            session()->flash('_installer_errors', $errors);

            return redirect()->route('install.configure');
        }

        try {
            $this->environment->write($input);
        } catch (Throwable $e) {
            session()->flash('_installer_old', $input);
            session()->flash('_installer_errors', ['db' => 'Could not write .env: '.$e->getMessage()]);

            return redirect()->route('install.configure');
        }

        session()->put('_installer_config', $input);

        return redirect()->route('install.run');
    }
}
