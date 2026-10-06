<?php

declare(strict_types=1);

/** @var string $message */
/** @var list<string> $log */
/** @var ?string $appUrl */
?>
<h1><?= installer_e($title ?? 'Error') ?></h1>
<p class="lede">Something went wrong during installation.</p>

<div class="alert alert-danger"><?= installer_e($message) ?></div>

<?php if (! empty($log)): ?>
    <ul class="log">
        <?php foreach ($log as $line): ?>
            <li><?= installer_e($line) ?></li>
        <?php endforeach; ?>
    </ul>
<?php endif; ?>

<div class="actions">
    <?php if (! empty($appUrl)): ?>
        <a class="btn btn-secondary" href="<?= installer_e(rtrim($appUrl, '/').'/login') ?>">Go to site</a>
    <?php endif; ?>
    <a class="btn btn-primary" href="install.php?step=configure">Back to configuration</a>
</div>
