<?php

declare(strict_types=1);

/** @var ?string $basePath */
/** @var string $appUrl */
?>
<h1>Already installed</h1>
<p class="lede">
    This copy of ElmapiCMS is already installed
    <?php if ($basePath): ?>
        (<code><?= installer_e($basePath.'/storage/app/installed') ?></code>).
    <?php else: ?>
        .
    <?php endif; ?>
    The installer will not run again.
</p>

<div class="alert alert-warn">
    If installer files are still in the document root, remove them now for security.
</div>

<form method="post" action="install.php?step=cleanup">
    <?= installer_csrf_field() ?>
    <div class="actions">
        <a class="btn btn-secondary" href="<?= installer_e(rtrim($appUrl, '/').'/login') ?>">Go to login</a>
        <button class="btn btn-primary" type="submit">Remove installer files</button>
    </div>
</form>
