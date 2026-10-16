<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Services;

use RuntimeException;

final class InstalledFileManager
{
    /**
     * Whether the application has been installed.
     */
    public static function installed(): bool
    {
        return is_file(storage_path('app/installed'));
    }

    /**
     * Write the install lock file with the same payload shape the previous
     * standalone installer produced.
     */
    public static function write(string $appUrl): void
    {
        $dir = storage_path('app');

        if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
            throw new RuntimeException('Could not create storage/app');
        }

        $payload = json_encode([
            'installed_at' => gmdate('c'),
            'app_url' => rtrim($appUrl, '/'),
            'installer' => 'elmapicms-installer',
        ], JSON_PRETTY_PRINT);

        if (file_put_contents($dir.'/installed', $payload === false ? 'installed' : $payload) === false) {
            throw new RuntimeException('Could not write storage/app/installed');
        }
    }
}
