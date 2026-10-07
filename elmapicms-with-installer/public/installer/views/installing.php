<?php

declare(strict_types=1);
?>
<ul class="steps">
    <li class="is-done">1. Requirements</li>
    <li class="is-done">2. Configuration</li>
    <li class="is-active">3. Install</li>
    <li>4. Done</li>
</ul>

<h1>Installing</h1>
<p class="lede"><span class="spinner" aria-hidden="true"></span> Creating <code>.env</code>, fixing paths, migrating, and seeding. Keep this tab open.</p>

<form id="install-form" method="post" action="install.php?step=install">
    <?= installer_csrf_field() ?>
</form>

<script>
document.getElementById('install-form').submit();
</script>

<noscript>
    <div class="actions">
        <button class="btn btn-primary" type="submit" form="install-form">Run installation</button>
    </div>
</noscript>
