<?php

declare(strict_types=1);

/**
 * ElmapiCMS shared-hosting installer entry point.
 * Place this file (and the installer/ folder) in the document root.
 */

define('ELMAPI_INSTALLER', true);
define('ELMAPI_INSTALLER_START', microtime(true));

$installerRoot = __DIR__.'/installer';

if (! is_dir($installerRoot) || ! is_file($installerRoot.'/bootstrap.php')) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Installer files are missing. Expected an installer/ directory next to install.php.\n";
    exit(1);
}

require $installerRoot.'/bootstrap.php';
