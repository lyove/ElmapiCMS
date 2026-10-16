<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Services;

final class RequirementsChecker
{
    private const PHP_MIN = '8.4.0';

    /** @var list<string> */
    private const EXTENSIONS = [
        'ctype',
        'curl',
        'dom',
        'fileinfo',
        'filter',
        'hash',
        'mbstring',
        'openssl',
        'pdo',
        'pdo_mysql',
        'session',
        'tokenizer',
        'xml',
        'json',
    ];

    /**
     * @return list<array{id: string, label: string, ok: bool, detail: string}>
     */
    public function check(string $basePath): array
    {
        $checks = [];

        $phpOk = version_compare(PHP_VERSION, self::PHP_MIN, '>=');
        $checks[] = [
            'id' => 'php',
            'label' => 'PHP '.self::PHP_MIN.' or higher',
            'ok' => $phpOk,
            'detail' => 'Detected PHP '.PHP_VERSION,
        ];

        foreach (self::EXTENSIONS as $ext) {
            $loaded = extension_loaded($ext);
            $checks[] = [
                'id' => 'ext_'.$ext,
                'label' => 'PHP extension: '.$ext,
                'ok' => $loaded,
                'detail' => $loaded ? 'Loaded' : 'Missing',
            ];
        }

        // In the package layout the application root is always the framework
        // base path, so vendor/autoload.php is guaranteed to exist.
        $checks[] = [
            'id' => 'app_path',
            'label' => 'ElmapiCMS application found',
            'ok' => true,
            'detail' => $basePath,
        ];

        $writable = [
            'base' => ['path' => $basePath, 'label' => 'Application root writable (for .env)'],
            'storage' => ['path' => $basePath.'/storage', 'label' => 'storage/ writable'],
            'framework' => ['path' => $basePath.'/storage/framework', 'label' => 'storage/framework/ writable'],
            'logs' => ['path' => $basePath.'/storage/logs', 'label' => 'storage/logs/ writable'],
            'cache' => ['path' => $basePath.'/bootstrap/cache', 'label' => 'bootstrap/cache/ writable'],
        ];

        foreach ($writable as $id => $item) {
            $ok = is_dir($item['path']) && is_writable($item['path']);
            $checks[] = [
                'id' => 'writable_'.$id,
                'label' => $item['label'],
                'ok' => $ok,
                'detail' => $ok ? 'Writable' : 'Not writable: '.$item['path'],
            ];
        }

        $envExample = is_file($basePath.'/.env.example');
        $checks[] = [
            'id' => 'env_example',
            'label' => '.env.example present',
            'ok' => true,
            'detail' => $envExample ? 'Found' : 'Missing — installer will use a built-in template',
        ];

        $already = InstalledFileManager::installed();
        $checks[] = [
            'id' => 'not_installed',
            'label' => 'Not already installed',
            'ok' => ! $already,
            'detail' => $already
                ? 'storage/app/installed exists — remove it only if you intend to reinstall'
                : 'Ready for a fresh install',
        ];

        return $checks;
    }

    /**
     * @param  list<array{ok: bool}>  $checks
     */
    public function allPassed(array $checks): bool
    {
        foreach ($checks as $check) {
            if (! $check['ok']) {
                return false;
            }
        }

        return true;
    }
}
