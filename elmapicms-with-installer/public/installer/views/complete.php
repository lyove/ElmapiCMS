<?php

declare(strict_types=1);

/** @var array{app_url: string, admin_email: string, base_path: string, cron: string} $done */
/** @var list<string> $log */
?>
<ul class="steps">
    <li class="is-done">1. Requirements</li>
    <li class="is-done">2. Configuration</li>
    <li class="is-done">3. Install</li>
    <li class="is-active">4. Done</li>
</ul>

<h1>Installation complete</h1>
<p class="lede">ElmapiCMS is ready. Add the cron job below, then remove the installer.</p>

<div class="alert alert-ok">
    Sign in with <strong><?= installer_e($done['admin_email']) ?></strong>
    at <a href="<?= installer_e(rtrim($done['app_url'], '/').'/login') ?>"><?= installer_e(rtrim($done['app_url'], '/').'/login') ?></a>
</div>

<h2>Webhook cron job</h2>
<p class="lede">
    In your hosting panel, create a cron job that runs <strong>once per minute</strong> (<code>* * * * *</code>).
    Adjust the PHP binary if your host documents a different path.
</p>
<pre class="code-block"><?= installer_e($done['cron']) ?></pre>

<?php if ($log !== []): ?>
    <ul class="log">
        <?php foreach ($log as $line): ?>
            <li><?= installer_e($line) ?></li>
        <?php endforeach; ?>
    </ul>
<?php endif; ?>

<form method="post" action="install.php?step=finish">
    <?= installer_csrf_field() ?>
    <div class="actions">
        <a class="btn btn-secondary" href="<?= installer_e(rtrim($done['app_url'], '/').'/login') ?>" target="_blank" rel="noopener">Open login</a>
        <button class="btn btn-primary" type="submit">Finish &amp; remove installer</button>
    </div>
</form>

<p class="meta">This deletes <code>install.php</code> and the <code>installer/</code> folder from the document root.</p>
