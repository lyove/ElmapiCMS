<?php

declare(strict_types=1);

/** @var string $view */
/** @var string $title */

$contentView = $view;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= installer_e($title ?? 'Install') ?> — ElmapiCMS</title>
    <link rel="icon" href="installer/assets/favicon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet">
    <link rel="stylesheet" href="installer/assets/install.css">
</head>
<body>
<div class="shell">
    <div class="brand">
        <div class="brand-mark">
            <img src="installer/assets/logo.svg" width="32" height="32" alt="ElmapiCMS">
        </div>
        <div class="brand-text">
            <strong>ElmapiCMS</strong>
            <span>Shared hosting installer</span>
        </div>
    </div>
    <div class="card">
        <?php require $contentView; ?>
    </div>
</div>
</body>
</html>
