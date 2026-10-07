<?php

declare(strict_types=1);

final class Installer
{
    private PathResolver $paths;
    private Requirements $requirements;
    private EnvWriter $envWriter;
    private PathFixer $pathFixer;
    private Cleanup $cleanup;

    public function __construct(
        private readonly string $publicPath,
        private readonly string $installerDir,
    ) {
        $this->paths = new PathResolver($publicPath);
        $this->requirements = new Requirements;
        $this->envWriter = new EnvWriter;
        $this->pathFixer = new PathFixer($this->paths, $publicPath);
        $this->cleanup = new Cleanup($publicPath, $installerDir);
    }

    public function handle(): void
    {
        $step = $_GET['step'] ?? 'requirements';
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        $basePath = $this->paths->resolve();

        // Allow complete/finish after a successful install (lock is written before redirect).
        // Cleanup stays available so leftover installer files can still be removed.
        if ($this->isLocked($basePath) && ! in_array($step, ['complete', 'finish'], true)) {
            if ($method === 'POST' && $step === 'cleanup') {
                installer_verify_csrf();
                $this->runCleanupAndExit();
            }

            installer_view('locked', [
                'title' => 'Already installed',
                'basePath' => $basePath,
                'appUrl' => installer_detect_app_url(),
            ]);

            return;
        }

        match ($step) {
            'requirements' => $this->showRequirements($basePath),
            'configure' => $method === 'POST'
                ? $this->submitConfigure($basePath)
                : $this->showConfigure($basePath),
            'install' => $this->runInstall($basePath),
            'complete' => $this->showComplete($basePath),
            'finish' => $method === 'POST'
                ? $this->finish($basePath)
                : installer_redirect('complete'),
            default => installer_redirect('requirements'),
        };
    }

    private function isLocked(?string $basePath): bool
    {
        return $basePath !== null && is_file($basePath.'/storage/app/installed');
    }

    private function showRequirements(?string $basePath): void
    {
        $checks = $this->requirements->check($basePath);

        installer_view('requirements', [
            'title' => 'Requirements',
            'checks' => $checks,
            'passed' => $this->requirements->allPassed($checks),
            'basePath' => $basePath,
            'relativeApp' => $basePath ? $this->paths->relativeFromPublic($basePath) : null,
        ]);
    }

    private function showConfigure(?string $basePath): void
    {
        if ($basePath === null || ! $this->requirements->allPassed($this->requirements->check($basePath))) {
            installer_redirect('requirements');
        }

        $old = $_SESSION['_installer_old'] ?? [];
        $errors = $_SESSION['_installer_errors'] ?? [];
        unset($_SESSION['_installer_old'], $_SESSION['_installer_errors']);

        installer_view('configure', [
            'title' => 'Configuration',
            'basePath' => $basePath,
            'old' => array_merge([
                'app_url' => installer_detect_app_url(),
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

    private function submitConfigure(?string $basePath): void
    {
        installer_verify_csrf();

        if ($basePath === null) {
            installer_redirect('requirements');
        }

        $input = [
            'app_url' => trim((string) ($_POST['app_url'] ?? '')),
            'db_host' => trim((string) ($_POST['db_host'] ?? '')),
            'db_port' => trim((string) ($_POST['db_port'] ?? '3306')),
            'db_database' => trim((string) ($_POST['db_database'] ?? '')),
            'db_username' => trim((string) ($_POST['db_username'] ?? '')),
            'db_password' => (string) ($_POST['db_password'] ?? ''),
            'admin_name' => trim((string) ($_POST['admin_name'] ?? 'Admin')),
            'admin_email' => trim((string) ($_POST['admin_email'] ?? '')),
            'admin_password' => (string) ($_POST['admin_password'] ?? ''),
            'admin_password_confirmation' => (string) ($_POST['admin_password_confirmation'] ?? ''),
        ];

        $errors = $this->validateConfigure($input);

        if ($errors === []) {
            try {
                $this->testDatabase($input);
            } catch (Throwable $e) {
                $errors['db'] = 'Database connection failed: '.$e->getMessage();
            }
        }

        if ($errors !== []) {
            $_SESSION['_installer_old'] = $input;
            $_SESSION['_installer_errors'] = $errors;
            installer_redirect('configure');
        }

        $_SESSION['_installer_config'] = $input;
        installer_redirect('install');
    }

    /**
     * @param  array<string, string>  $input
     * @return array<string, string>
     */
    private function validateConfigure(array $input): array
    {
        $errors = [];

        if ($input['app_url'] === '' || ! filter_var($input['app_url'], FILTER_VALIDATE_URL)) {
            $errors['app_url'] = 'Enter a valid site URL (including https://).';
        }

        if ($input['db_host'] === '') {
            $errors['db_host'] = 'Database host is required.';
        }

        if ($input['db_port'] === '' || ! ctype_digit($input['db_port'])) {
            $errors['db_port'] = 'Database port must be a number.';
        }

        if ($input['db_database'] === '') {
            $errors['db_database'] = 'Database name is required.';
        }

        if ($input['db_username'] === '') {
            $errors['db_username'] = 'Database username is required.';
        }

        if ($input['admin_name'] === '') {
            $errors['admin_name'] = 'Admin name is required.';
        }

        if ($input['admin_email'] === '' || ! filter_var($input['admin_email'], FILTER_VALIDATE_EMAIL)) {
            $errors['admin_email'] = 'Enter a valid admin email.';
        }

        if (strlen($input['admin_password']) < 8) {
            $errors['admin_password'] = 'Password must be at least 8 characters.';
        }

        if ($input['admin_password'] !== $input['admin_password_confirmation']) {
            $errors['admin_password_confirmation'] = 'Password confirmation does not match.';
        }

        return $errors;
    }

    /**
     * @param  array<string, string>  $input
     */
    private function testDatabase(array $input): void
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $input['db_host'],
            $input['db_port'],
            $input['db_database']
        );

        new PDO($dsn, $input['db_username'], $input['db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 8,
        ]);
    }

    private function runInstall(?string $basePath): void
    {
        // GET with session config → show confirm / auto-post page
        // Actually we redirect to install after configure with GET - need to show installing UI then POST
        $config = $_SESSION['_installer_config'] ?? null;

        if (! is_array($config) || $basePath === null) {
            installer_redirect('configure');
        }

        // First GET: show progress page that auto-submits
        if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
            installer_view('installing', [
                'title' => 'Installing',
                'basePath' => $basePath,
            ]);

            return;
        }

        installer_verify_csrf();

        $log = [];

        try {
            if ($this->isLocked($basePath)) {
                throw new RuntimeException('Application is already installed.');
            }

            // Allow retry after a failed attempt (no lock yet)
            if (is_file($basePath.'/.env')) {
                @unlink($basePath.'/.env');
                $log[] = 'Removed incomplete .env from a previous attempt';
            }

            $appKey = installer_generate_app_key();
            $log[] = 'Generated APP_KEY';

            $this->envWriter->write($basePath, [
                'app_url' => rtrim($config['app_url'], '/'),
                'db_host' => $config['db_host'],
                'db_port' => $config['db_port'],
                'db_database' => $config['db_database'],
                'db_username' => $config['db_username'],
                'db_password' => $config['db_password'],
                'app_key' => $appKey,
            ]);
            $log[] = 'Created .env';

            $pathActions = $this->pathFixer->apply($basePath);
            foreach ($pathActions as $action) {
                $log[] = $action;
            }
            if ($pathActions === []) {
                $log[] = 'Paths OK (no changes needed)';
            }

            $this->bootLaravelAndMigrate($basePath, $config, $log);

            $this->writeLockFile($basePath, $config);
            $log[] = 'Wrote install lock';

            $_SESSION['_installer_log'] = $log;
            $_SESSION['_installer_done'] = [
                'app_url' => rtrim($config['app_url'], '/'),
                'admin_email' => $config['admin_email'],
                'base_path' => $basePath,
                'cron' => $this->cronCommand($basePath),
            ];
            unset($_SESSION['_installer_config']);

            installer_redirect('complete');
        } catch (Throwable $e) {
            $_SESSION['_installer_errors'] = ['install' => $e->getMessage()];
            $_SESSION['_installer_old'] = $config;
            $_SESSION['_installer_log'] = $log;
            // Leave partial .env for debugging? Better remove if we created it mid-fail after write
            installer_view('error', [
                'title' => 'Installation failed',
                'message' => $e->getMessage(),
                'log' => $log,
            ]);
        }
    }

    /**
     * @param  array<string, string>  $config
     * @param  list<string>  $log
     */
    private function bootLaravelAndMigrate(string $basePath, array $config, array &$log): void
    {
        require $basePath.'/vendor/autoload.php';

        /** @var \Illuminate\Foundation\Application $app */
        $app = require $basePath.'/bootstrap/app.php';

        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        $log[] = 'Bootstrapped Laravel';

        $migrate = $kernel->call('migrate', ['--force' => true]);
        if ($migrate !== 0) {
            throw new RuntimeException('Migration failed. Output: '.$kernel->output());
        }
        $log[] = 'Ran migrations';

        $seed = $kernel->call('db:seed', ['--force' => true]);
        if ($seed !== 0) {
            throw new RuntimeException('Seeding failed. Output: '.$kernel->output());
        }
        $log[] = 'Ran database seeders';

        $user = \App\Models\User::query()->where('email', 'admin@admin.com')->first();
        if ($user === null) {
            $user = \App\Models\User::query()->orderBy('id')->first();
        }

        if ($user === null) {
            throw new RuntimeException('Admin user was not created by the seeder.');
        }

        $user->name = $config['admin_name'];
        $user->email = $config['admin_email'];
        $user->password = $config['admin_password'];
        $user->save();
        $log[] = 'Updated admin account ('.$config['admin_email'].')';

        try {
            $kernel->call('config:clear');
            $kernel->call('route:clear');
            $kernel->call('view:clear');
            $log[] = 'Cleared caches';
        } catch (Throwable) {
            // Non-fatal on shared hosting
        }
    }

    /**
     * @param  array<string, string>  $config
     */
    private function writeLockFile(string $basePath, array $config): void
    {
        $dir = $basePath.'/storage/app';
        if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
            throw new RuntimeException('Could not create storage/app');
        }

        $payload = json_encode([
            'installed_at' => gmdate('c'),
            'app_url' => rtrim($config['app_url'], '/'),
            'installer' => 'elmapicms-installer',
        ], JSON_PRETTY_PRINT);

        if (file_put_contents($dir.'/installed', $payload === false ? 'installed' : $payload) === false) {
            throw new RuntimeException('Could not write storage/app/installed');
        }
    }

    private function cronCommand(string $basePath): string
    {
        $php = PHP_BINARY !== '' ? PHP_BINARY : '/usr/local/bin/php';

        // Shared hosts often expose a different PHP for cron than the web SAPI binary
        if (str_contains($php, 'php-fpm') || str_contains($php, 'cgi')) {
            $php = '/usr/local/bin/php';
        }

        return sprintf(
            '%s %s/artisan queue:work --queue=webhooks --stop-when-empty >> /dev/null 2>&1',
            $php,
            $basePath
        );
    }

    private function showComplete(?string $basePath): void
    {
        $done = $_SESSION['_installer_done'] ?? null;

        if (! is_array($done)) {
            if ($this->isLocked($basePath)) {
                installer_view('locked', [
                    'title' => 'Already installed',
                    'basePath' => $basePath,
                    'appUrl' => installer_detect_app_url(),
                ]);

                return;
            }
            installer_redirect('requirements');
        }

        installer_view('complete', [
            'title' => 'Installation complete',
            'done' => $done,
            'log' => $_SESSION['_installer_log'] ?? [],
        ]);
    }

    private function finish(?string $basePath): void
    {
        installer_verify_csrf();

        if (! $this->isLocked($basePath)) {
            installer_redirect('requirements');
        }

        $appUrl = $_SESSION['_installer_done']['app_url'] ?? installer_detect_app_url();
        unset($_SESSION['_installer_done'], $_SESSION['_installer_log'], $_SESSION['_installer_config']);

        $this->runCleanupAndExit($appUrl);
    }

    private function runCleanupAndExit(?string $appUrl = null): never
    {
        $appUrl = $appUrl ?? installer_detect_app_url();

        try {
            $this->cleanup->removeInstallerFiles();
        } catch (Throwable $e) {
            installer_view('error', [
                'title' => 'Cleanup incomplete',
                'message' => $e->getMessage().' Installation succeeded — delete install.php and installer/ manually, then open your site.',
                'log' => [],
                'appUrl' => $appUrl,
            ]);
            exit;
        }

        header('Location: '.rtrim($appUrl, '/').'/login');
        exit;
    }
}
