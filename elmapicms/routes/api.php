<?php

use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\CollectionAdminController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\ContentVersionController;
use App\Http\Controllers\Api\FieldAdminController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectLocaleController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

Route::middleware(['project', 'throttle:api'])->group(function () {
    Route::get('/', [ProjectController::class, 'show'])->middleware('project.ability:read');

    Route::prefix('project')->controller(ProjectLocaleController::class)->group(function () {
        Route::post('/locales', 'store')->middleware('project.ability:admin');
        Route::put('/locales/default', 'setDefault')->middleware('project.ability:admin');
        Route::delete('/locales/{locale}', 'destroy')->middleware('project.ability:admin');
    });

    Route::prefix('auth')->name('api.auth.')->controller(AuthController::class)->group(function () {
        Route::post('/signup', 'signUp')
            ->middleware('throttle:auth-signup')
            ->name('signup');
        Route::post('/login', 'signIn')
            ->middleware('throttle:auth-signin')
            ->name('login');
        Route::post('/refresh', 'refresh')
            ->middleware('throttle:auth-refresh')
            ->name('refresh');
        Route::post('/verify-email/resend', 'resendVerificationEmail')
            ->middleware('throttle:auth-verification-resend')
            ->name('verify_email.resend');
        Route::post('/verify-email/confirm', 'confirmVerificationEmail')
            ->middleware('throttle:auth-verification-confirm')
            ->name('verify_email.confirm');
        Route::post('/logout', 'logout')
            ->middleware('project.auth_user')
            ->name('logout');
        Route::post('/logout-all', 'logoutAll')
            ->middleware('project.auth_user')
            ->name('logout_all');
        Route::get('/me', 'me')
            ->middleware('project.auth_user')
            ->name('me');
        Route::post('/change-password', 'changePassword')
            ->middleware('project.auth_user')
            ->name('change_password');

        Route::prefix('api-keys')->name('api_keys.')->group(function () {
            Route::get('/', 'listApiKeys')
                ->middleware(['project.auth_user', 'throttle:auth-api-keys'])
                ->name('index');
            Route::post('/', 'createApiKey')
                ->middleware(['project.auth_user', 'throttle:auth-api-keys'])
                ->name('create');
            Route::post('/{keyId}/revoke', 'revokeApiKey')
                ->middleware(['project.auth_user', 'throttle:auth-api-keys'])
                ->name('revoke');
            Route::post('/introspect', 'introspectApiKey')
                ->middleware(['project.ability:introspect', 'throttle:auth-api-key-introspect'])
                ->name('introspect');
        });
    });

    Route::prefix('files')->controller(AssetController::class)->group(function () {
        Route::get('/', 'index')->middleware('project.ability:read');
        Route::post('/bulk/upload', 'bulkUpload')->middleware('project.ability:create');
        Route::patch('/bulk/metadata', 'bulkUpdateMetadata')->middleware('project.ability:update');
        Route::post('/upload-url', 'directUploadInitiate')->middleware('project.ability:create');
        Route::post('/upload-finalize', 'directUploadFinalize')->middleware('project.ability:create');
        Route::post('/multipart/initiate', 'directMultipartInitiate')->middleware('project.ability:create');
        Route::post('/multipart/part-url', 'directMultipartPartUrl')->middleware('project.ability:create');
        Route::post('/multipart/complete', 'directMultipartComplete')->middleware('project.ability:create');
        Route::get('/name/{filename}', 'showByName')->middleware('project.ability:read');
        Route::get('/{identifier}', 'show')->middleware('project.ability:read');
        Route::post('/', 'store')->middleware('project.ability:create');
        Route::delete('/{identifier}', 'destroy')->middleware('project.ability:delete');
    });

    Route::prefix('collections')->group(function () {
        Route::controller(CollectionController::class)->group(function () {
            Route::get('/', 'index')->middleware('project.ability:read');
            Route::get('/{collection}', 'show')->middleware('project.ability:read');
        });

        Route::controller(CollectionAdminController::class)->group(function () {
            Route::post('/reorder', 'reorder')->middleware('project.ability:admin');
            Route::post('/', 'store')->middleware('project.ability:admin');
            Route::put('/{collection}', 'update')->middleware('project.ability:admin');
            Route::delete('/{collection}', 'destroy')->middleware('project.ability:admin');
        });

        Route::prefix('{collection}/fields')->controller(FieldAdminController::class)->group(function () {
            Route::post('/reorder', 'reorder')->middleware('project.ability:admin');
            Route::post('/', 'store')->middleware('project.ability:admin');
            Route::put('/{field}', 'update')->middleware('project.ability:admin');
            Route::delete('/{field}', 'destroy')->middleware('project.ability:admin');
        });
    });

    Route::post('/bulk/{collection}/entries', [ContentController::class, 'bulkStore'])->middleware('project.ability:create');
    Route::patch('/bulk/{collection}/entries', [ContentController::class, 'bulkUpdate'])->middleware('project.ability:update');
    Route::delete('/bulk/{collection}/entries', [ContentController::class, 'bulkDestroy'])->middleware('project.ability:delete');

    Route::post('/{collection}/{uuid}/link-translation', [ContentController::class, 'linkTranslation'])->middleware('project.ability:update');
    Route::post('/{collection}/{uuid}/publish', [ContentController::class, 'publish'])->middleware('project.ability:update');
    Route::post('/{collection}/{uuid}/unpublish', [ContentController::class, 'unpublish'])->middleware('project.ability:update');
    Route::post('/{collection}/{uuid}/discard-draft', [ContentController::class, 'discardDraft'])->middleware('project.ability:update');

    Route::get('/{collection}/{uuid}/versions', [ContentVersionController::class, 'index'])->middleware('project.ability:read');
    Route::get('/{collection}/{uuid}/versions/{version}', [ContentVersionController::class, 'show'])
        ->whereNumber('version')
        ->middleware('project.ability:read');
    Route::post('/{collection}/{uuid}/versions/{version}/revert', [ContentVersionController::class, 'revert'])
        ->whereNumber('version')
        ->middleware('project.ability:update');
    Route::patch('/{collection}/{uuid}/versions/{version}', [ContentVersionController::class, 'updateLabel'])
        ->whereNumber('version')
        ->middleware('project.ability:update');

    Route::prefix('webhooks')->controller(WebhookController::class)->group(function () {
        Route::get('/', 'index')->middleware('project.ability:admin');
        Route::post('/', 'store')->middleware('project.ability:admin');
        Route::get('/{webhook:uuid}/logs', 'logs')->middleware('project.ability:admin');
        Route::get('/{webhook:uuid}', 'show')->middleware('project.ability:admin');
        Route::put('/{webhook:uuid}', 'update')->middleware('project.ability:admin');
        Route::delete('/{webhook:uuid}', 'destroy')->middleware('project.ability:admin');
    });

    Route::get('/{collection}/{uuid}', [ContentController::class, 'show'])->middleware('project.ability:read');
    Route::match(['put', 'patch'], '/{collection}/{uuid}', [ContentController::class, 'update'])->middleware('project.ability:update');
    Route::delete('/{collection}/{uuid}', [ContentController::class, 'destroy'])->middleware('project.ability:delete');
    Route::post('/{collection}', [ContentController::class, 'store'])->middleware('project.ability:create');
    Route::get('/{collection}', [ContentController::class, 'index'])->middleware('project.ability:read');
});
