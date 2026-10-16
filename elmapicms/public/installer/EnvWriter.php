<?php

declare(strict_types=1);

final class EnvWriter
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
     * @param  array{
     *   app_url: string,
     *   db_host: string,
     *   db_port: string,
     *   db_database: string,
     *   db_username: string,
     *   db_password: string,
     *   app_key: string
     * }  $config
     */
    public function write(string $basePath, array $config): string
    {
        $target = $basePath.'/.env';

        $example = $basePath.'/.env.example';
        $contents = is_file($example)
            ? (string) file_get_contents($example)
            : self::FALLBACK_TEMPLATE;

        $replacements = [
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_KEY' => $config['app_key'],
            'APP_URL' => $config['app_url'],
            'LOG_LEVEL' => 'error',
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => $config['db_host'],
            'DB_PORT' => $config['db_port'],
            'DB_DATABASE' => $config['db_database'],
            'DB_USERNAME' => $config['db_username'],
            'DB_PASSWORD' => $config['db_password'],
            'SESSION_DRIVER' => 'database',
            'QUEUE_CONNECTION' => 'database',
            'CACHE_STORE' => 'database',
        ];

        foreach ($replacements as $key => $value) {
            $contents = $this->setEnvValue($contents, $key, $value);
        }

        if (file_put_contents($target, $contents) === false) {
            throw new RuntimeException('Could not write .env to '.$target);
        }

        return $target;
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
