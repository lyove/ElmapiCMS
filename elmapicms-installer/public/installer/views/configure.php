<?php

declare(strict_types=1);

/** @var array<string, string> $old */
/** @var array<string, string> $errors */
?>
<ul class="steps">
    <li class="is-done">1. Requirements</li>
    <li class="is-active">2. Configuration</li>
    <li>3. Install</li>
    <li>4. Done</li>
</ul>

<h1>Configuration</h1>
<p class="lede">Enter your site URL, MySQL credentials, and the first admin account.</p>

<?php if (! empty($errors)): ?>
    <div class="alert alert-danger">
        Fix the highlighted fields, then try again.
        <?php if (! empty($errors['db'])): ?>
            <div style="margin-top:0.5rem"><?= installer_e($errors['db']) ?></div>
        <?php endif; ?>
        <?php if (! empty($errors['install'])): ?>
            <div style="margin-top:0.5rem"><?= installer_e($errors['install']) ?></div>
        <?php endif; ?>
    </div>
<?php endif; ?>

<form method="post" action="install.php?step=configure" autocomplete="off">
    <?= installer_csrf_field() ?>

    <fieldset>
        <legend>Site</legend>
        <div class="form-grid">
            <div>
                <label for="app_url">Site URL</label>
                <input id="app_url" name="app_url" type="url" required
                       value="<?= installer_e($old['app_url'] ?? '') ?>"
                       placeholder="https://example.com">
                <?php if (! empty($errors['app_url'])): ?>
                    <div class="field-error"><?= installer_e($errors['app_url']) ?></div>
                <?php endif; ?>
            </div>
        </div>
    </fieldset>

    <fieldset>
        <legend>Database</legend>
        <div class="form-grid two">
            <div>
                <label for="db_host">Host</label>
                <input id="db_host" name="db_host" type="text" required
                       value="<?= installer_e($old['db_host'] ?? 'localhost') ?>">
                <?php if (! empty($errors['db_host'])): ?>
                    <div class="field-error"><?= installer_e($errors['db_host']) ?></div>
                <?php endif; ?>
            </div>
            <div>
                <label for="db_port">Port</label>
                <input id="db_port" name="db_port" type="text" required
                       value="<?= installer_e($old['db_port'] ?? '3306') ?>">
                <?php if (! empty($errors['db_port'])): ?>
                    <div class="field-error"><?= installer_e($errors['db_port']) ?></div>
                <?php endif; ?>
            </div>
            <div>
                <label for="db_database">Database name</label>
                <input id="db_database" name="db_database" type="text" required
                       value="<?= installer_e($old['db_database'] ?? '') ?>">
                <?php if (! empty($errors['db_database'])): ?>
                    <div class="field-error"><?= installer_e($errors['db_database']) ?></div>
                <?php endif; ?>
            </div>
            <div>
                <label for="db_username">Username</label>
                <input id="db_username" name="db_username" type="text" required
                       value="<?= installer_e($old['db_username'] ?? '') ?>">
                <?php if (! empty($errors['db_username'])): ?>
                    <div class="field-error"><?= installer_e($errors['db_username']) ?></div>
                <?php endif; ?>
            </div>
            <div style="grid-column: 1 / -1">
                <label for="db_password">Password</label>
                <input id="db_password" name="db_password" type="password"
                       value="<?= installer_e($old['db_password'] ?? '') ?>">
            </div>
        </div>
    </fieldset>

    <fieldset>
        <legend>Admin account</legend>
        <div class="form-grid two">
            <div>
                <label for="admin_name">Name</label>
                <input id="admin_name" name="admin_name" type="text" required
                       value="<?= installer_e($old['admin_name'] ?? 'Admin') ?>">
                <?php if (! empty($errors['admin_name'])): ?>
                    <div class="field-error"><?= installer_e($errors['admin_name']) ?></div>
                <?php endif; ?>
            </div>
            <div>
                <label for="admin_email">Email</label>
                <input id="admin_email" name="admin_email" type="email" required
                       value="<?= installer_e($old['admin_email'] ?? '') ?>">
                <?php if (! empty($errors['admin_email'])): ?>
                    <div class="field-error"><?= installer_e($errors['admin_email']) ?></div>
                <?php endif; ?>
            </div>
            <div>
                <label for="admin_password">Password</label>
                <input id="admin_password" name="admin_password" type="password" required minlength="8"
                       value="">
                <?php if (! empty($errors['admin_password'])): ?>
                    <div class="field-error"><?= installer_e($errors['admin_password']) ?></div>
                <?php endif; ?>
            </div>
            <div>
                <label for="admin_password_confirmation">Confirm password</label>
                <input id="admin_password_confirmation" name="admin_password_confirmation" type="password" required minlength="8"
                       value="">
                <?php if (! empty($errors['admin_password_confirmation'])): ?>
                    <div class="field-error"><?= installer_e($errors['admin_password_confirmation']) ?></div>
                <?php endif; ?>
            </div>
        </div>
    </fieldset>

    <div class="actions">
        <a class="btn btn-secondary" href="install.php?step=requirements">Back</a>
        <button class="btn btn-primary" type="submit">Save &amp; continue</button>
    </div>
</form>
