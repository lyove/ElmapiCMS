<?php

use App\Http\Controllers\AssetController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Frontend (public) routes
|--------------------------------------------------------------------------
| Public-facing routes: media streaming and the front page.
| The front page shows a project introduction for visitors and redirects
| logged-in users to the admin dashboard.
*/

// This route will serve files from the public storage disk without a symlink.
Route::get('/uploads/{path}', [AssetController::class, 'stream'])
    ->where('path', '.*')
    ->middleware('throttle:120,1');

// Front page: visitors see the project introduction page.
Route::get('/', function () {
    return view('frontend.welcome');
});
