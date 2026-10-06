<?php

declare(strict_types=1);

/** @var list<array{id: string, label: string, ok: bool, detail: string}> $checks */
/** @var bool $passed */
/** @var ?string $basePath */
/** @var ?string $relativeApp */
?>
<ul class="steps">
    <li class="is-active">1. Requirements</li>
    <li>2. Configuration</li>
    <li>3. Install</li>
    <li>4. Done</li>
</ul>

<h1>Requirements</h1>
<p class="lede">Checking that this server can run ElmapiCMS before configuration.</p>

<ul class="check-list">
    <?php foreach ($checks as $check): ?>
        <li class="<?= $check['ok'] ? 'ok' : 'bad' ?>">
            <span class="status" aria-hidden="true"><?= $check['ok'] ? '✓' : '!' ?></span>
            <span class="label"><?= installer_e($check['label']) ?></span>
            <span class="detail"><?= installer_e($check['detail']) ?></span>
        </li>
    <?php endforeach; ?>
</ul>

<?php if ($basePath && $relativeApp): ?>
    <p class="meta">Application path: <code><?= installer_e($basePath) ?></code><br>
        Relative from document root: <code><?= installer_e($relativeApp) ?></code></p>
<?php endif; ?>

<div class="actions">
    <?php if ($passed): ?>
        <a class="btn btn-primary" href="install.php?step=configure">Continue</a>
    <?php else: ?>
        <a class="btn btn-secondary" href="install.php?step=requirements">Recheck</a>
        <button class="btn btn-primary" type="button" disabled>Fix the issues above to continue</button>
    <?php endif; ?>
</div>
