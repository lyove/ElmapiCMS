<?php

declare(strict_types=1);

if (! defined('ELMAPI_INSTALLER')) {
    http_response_code(403);
    exit('Forbidden');
}

session_start();

require __DIR__.'/helpers.php';
require __DIR__.'/Requirements.php';
require __DIR__.'/PathResolver.php';
require __DIR__.'/EnvWriter.php';
require __DIR__.'/PathFixer.php';
require __DIR__.'/Installer.php';
require __DIR__.'/Cleanup.php';

$publicPath = dirname(__DIR__);

try {
    $installer = new Installer($publicPath, __DIR__);
    $installer->handle();
} catch (Throwable $e) {
    http_response_code(500);
    installer_view('error', [
        'title' => 'Installer error',
        'message' => $e->getMessage(),
        'log' => [],
    ]);
}
