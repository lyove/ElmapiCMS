<?php

declare(strict_types=1);

use ElmapiCMS\Installer\Controllers\CompleteController;
use ElmapiCMS\Installer\Controllers\ConfigureController;
use ElmapiCMS\Installer\Controllers\InstallController;
use ElmapiCMS\Installer\Controllers\RequirementsController;
use ElmapiCMS\Installer\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web installer routes
|--------------------------------------------------------------------------
| Everything lives under /install. The "install" middleware group (CanInstall)
| blocks the whole wizard once storage/app/installed exists.
*/

Route::prefix('install')
    ->name('install.')
    ->middleware(['web', 'install'])
    ->group(function () {
        Route::get('/', [WelcomeController::class, 'welcome'])->name('welcome');
        Route::get('/requirements', [RequirementsController::class, 'index'])->name('requirements');
        Route::get('/configure', [ConfigureController::class, 'show'])->name('configure');
        Route::post('/configure', [ConfigureController::class, 'save'])->name('configure.save');
        Route::get('/run', [InstallController::class, 'show'])->name('run');
        Route::post('/run', [InstallController::class, 'run'])->name('run.post');
        Route::get('/complete', [CompleteController::class, 'show'])->name('complete');
        Route::post('/finish', [CompleteController::class, 'finish'])->name('finish');
    });
