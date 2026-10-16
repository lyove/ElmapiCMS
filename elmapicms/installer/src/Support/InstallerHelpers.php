<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Support;

final class InstallerHelpers
{
    /**
     * Generate a fresh Laravel-style APP_KEY value.
     */
    public static function generateAppKey(): string
    {
        return 'base64:'.base64_encode(random_bytes(32));
    }

    /**
     * Build the queue worker cron command shown on the completion page.
     */
    public static function cronCommand(string $basePath): string
    {
        $php = PHP_BINARY !== '' ? PHP_BINARY : '/usr/local/bin/php';

        // CLI cron often uses a different PHP than the web SAPI binary.
        if (str_contains($php, 'php-fpm') || str_contains($php, 'cgi')) {
            $php = '/usr/local/bin/php';
        }

        return sprintf(
            '%s %s/artisan queue:work --queue=webhooks --stop-when-empty >> /dev/null 2>&1',
            $php,
            $basePath
        );
    }
}
