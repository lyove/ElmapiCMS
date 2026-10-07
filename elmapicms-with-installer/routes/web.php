<?php

/*
|--------------------------------------------------------------------------
| Web routes entry point
|--------------------------------------------------------------------------
| Route files are split by area:
|   - routes/frontend.php : public-facing routes (front page, media streaming)
|   - routes/admin.php    : the entire admin panel, everything under /admin/...
|   - routes/auth.php     : authentication (login, register, logout)
|   - routes/api.php      : public content API (loaded via bootstrap)
*/

require __DIR__.'/frontend.php';
require __DIR__.'/admin.php';
require __DIR__.'/auth.php';
