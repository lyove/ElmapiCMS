<?php

declare(strict_types=1);

function installer_view(string $name, array $data = []): void
{
    extract($data, EXTR_SKIP);
    $view = __DIR__.'/views/'.$name.'.php';

    if (! is_file($view)) {
        throw new RuntimeException("Installer view [{$name}] not found.");
    }

    require __DIR__.'/views/layout.php';
}

function installer_e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function installer_csrf_token(): string
{
    if (empty($_SESSION['_installer_csrf'])) {
        $_SESSION['_installer_csrf'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['_installer_csrf'];
}

function installer_csrf_field(): string
{
    return '<input type="hidden" name="_token" value="'.installer_e(installer_csrf_token()).'">';
}

function installer_verify_csrf(): void
{
    $token = $_POST['_token'] ?? '';
    $session = $_SESSION['_installer_csrf'] ?? '';

    if (! is_string($token) || $token === '' || ! hash_equals($session, $token)) {
        throw new RuntimeException('Invalid security token. Refresh the page and try again.');
    }
}

function installer_redirect(string $step): never
{
    $query = http_build_query(['step' => $step]);
    header('Location: install.php?'.$query);
    exit;
}

function installer_generate_app_key(): string
{
    return 'base64:'.base64_encode(random_bytes(32));
}

function installer_detect_app_url(): string
{
    $https = (! empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

    return rtrim($scheme.'://'.$host, '/');
}

/**
 * Recursively delete a file or directory.
 */
function installer_delete_path(string $path): bool
{
    if (! file_exists($path)) {
        return true;
    }

    if (is_file($path) || is_link($path)) {
        return unlink($path);
    }

    $items = scandir($path);
    if ($items === false) {
        return false;
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        if (! installer_delete_path($path.DIRECTORY_SEPARATOR.$item)) {
            return false;
        }
    }

    return rmdir($path);
}
