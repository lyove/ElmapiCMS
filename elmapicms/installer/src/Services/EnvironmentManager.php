<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Services;

use PDO;
use RuntimeException;
use Throwable;

final class EnvironmentManager
{
    private const FALLBACK_TEMPLATE = <<<'ENV'
APP_NAME="ElmapiCMS 4.0"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://localhost

APP_VERSION="4.0.0"

MAX_FILE_SIZE=2M
ASSET_DIRECT_UPLOAD=false

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=elmapicms
DB_USERNAME=elmapicms
DB_PASSWORD=

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=database

MAIL_MAILER=log
MAIL_SCHEME=null
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

VITE_APP_NAME="${APP_NAME}"
ENV;

    /**
     * @param  array<string, string>  $input
     * @return array<string, string>
     */
    public function validate(array $input): array
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
     * Verify the supplied MySQL credentials before writing anything.
     *
     * @param  array<string, string>  $input
     */
    public function testConnection(array $input): void
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

    /**
     * Write the real .env from .env.example (or the built-in template).
     *
     * APP_KEY is left untouched: the pre-boot bootstrap already generated one
     * during the "not installed" window. SESSION_DRIVER / QUEUE_CONNECTION /
     * CACHE_STORE are also left as file/sync/file so the wizard itself never
     * touches database tables that do not exist yet; finalizeDrivers() flips
     * them back once migrations have run.
     *
     * @param  array<string, string>  $input
     */
    public function write(array $input): string
    {
        $target = base_path('.env');

        $example = base_path('.env.example');
        $contents = is_file($example)
            ? (string) file_get_contents($example)
            : self::FALLBACK_TEMPLATE;

        // Preserve the APP_KEY that the pre-boot bootstrap generated during the
        // not-installed window. .env.example ships an empty APP_KEY placeholder,
        // and re-rolling the key mid-install would invalidate the session cookie
        // (the previous key no longer decrypts it) and break the wizard flow.
        $appKey = '';
        if (is_file($target)) {
            $currentEnv = (string) file_get_contents($target);
            if (preg_match('/^APP_KEY=(.+)$/m', $currentEnv, $keyMatch)) {
                $appKey = trim($keyMatch[1]);
            }
        }
        if ($appKey === '') {
            $appKey = 'base64:'.base64_encode(random_bytes(32));
        }

        $replacements = [
            'APP_KEY' => $appKey,
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_URL' => rtrim($input['app_url'], '/'),
            'LOG_LEVEL' => 'error',
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => $input['db_host'],
            'DB_PORT' => $input['db_port'],
            'DB_DATABASE' => $input['db_database'],
            'DB_USERNAME' => $input['db_username'],
            'DB_PASSWORD' => $input['db_password'],
        ];

        foreach ($replacements as $key => $value) {
            $contents = $this->setEnvValue($contents, $key, $value);
        }

        if (file_put_contents($target, $contents) === false) {
            throw new RuntimeException('Could not write .env to '.$target);
        }

        return $target;
    }

    /**
     * Called after migrations and seeding succeed: switch session, queue and
     * cache back to their production database drivers.
     */
    public function finalizeDrivers(): void
    {
        $target = base_path('.env');

        if (! is_file($target)) {
            return;
        }

        $contents = (string) file_get_contents($target);

        $contents = $this->setEnvValue($contents, 'SESSION_DRIVER', 'database');
        $contents = $this->setEnvValue($contents, 'QUEUE_CONNECTION', 'database');
        $contents = $this->setEnvValue($contents, 'CACHE_STORE', 'database');

        if (file_put_contents($target, $contents) === false) {
            throw new RuntimeException('Could not finalize .env at '.$target);
        }
    }

    private function setEnvValue(string $contents, string $key, string $value): string
    {
        $escaped = $this->escapeValue($value);
        // Match active or commented assignment (common in .env.example)
        $pattern = '/^#?\s*'.preg_quote($key, '/').'=.*$/m';

        if (preg_match($pattern, $contents)) {
            return (string) preg_replace($pattern, $key.'='.$escaped, $contents, 1);
        }

        return rtrim($contents)."\n{$key}={$escaped}\n";
    }

    private function escapeValue(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (preg_match('/[\s#\'"\\\\]/', $value)) {
            return '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $value).'"';
        }

        return $value;
    }
}
