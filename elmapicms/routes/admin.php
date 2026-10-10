<?php

use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\CollectionTemplateController;
use App\Http\Controllers\ContentAiController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\FieldController;
use App\Http\Controllers\ProjectAuthSettingsController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectSettingsController;
use App\Http\Controllers\ProjectTemplateController;
use App\Http\Controllers\Settings\AppSettingsController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\UserManagement\PermissionController;
use App\Http\Controllers\UserManagement\RoleController;
use App\Http\Controllers\UserManagement\UserController;
use App\Http\Controllers\WebhookController;
use App\Http\Middleware\EnsureProjectMember;
use App\Models\Project;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Admin routes
|--------------------------------------------------------------------------
| Everything in the admin panel lives under the /admin/... prefix:
| dashboard, projects, collections, content, assets, user management,
| global settings, AI chat and templates.
*/

Route::middleware(['auth', 'verified'])->prefix('admin')->group(function () {
    // Dashboard
    Route::get('/', function () {
        return Inertia::render('admin/dashboard', [
            'projects' => Project::when(! auth()->user()->can('access_all_projects'), function ($q) {
                $user = auth()->user();

                return $q->whereIn('id', $user->projects()->pluck('projects.id'));
            })->withCount(['collections', 'assets', 'content'])->latest()->get(),
        ]);
    })->name('dashboard');

    Route::prefix('user-management')->name('user-management.')->group(function () {
        // Render the users page
        Route::get('/users', [UserController::class, 'index'])->name('users.index')->middleware(['permission:access_users']);

        // Render the roles page
        Route::get('/roles', [RoleController::class, 'index'])->name('roles.index')->middleware(['permission:access_roles']);

        // Render the permissions page
        Route::get('/permissions', [PermissionController::class, 'index'])->name('permissions.index')->middleware(['permission:access_permissions']);

        // API routes with prefix
        Route::prefix('api')->group(function () {
            Route::get('/users', [UserController::class, 'apiIndex'])->middleware(['permission:access_users']);
            Route::post('/users', [UserController::class, 'apiStore'])->middleware(['permission:create_users']);
            Route::put('/users/{user}', [UserController::class, 'apiUpdate'])->middleware(['permission:update_users']);
            Route::delete('/users/{user}', [UserController::class, 'apiDestroy'])->middleware(['permission:delete_users']);
            Route::post('/users/bulk-delete', [UserController::class, 'apiBulkDelete'])->middleware(['permission:delete_users']);

            // Role API routes
            Route::get('/roles', [RoleController::class, 'apiIndex'])->middleware(['permission:access_roles']);
            Route::post('/roles', [RoleController::class, 'apiStore'])->middleware(['permission:create_roles']);
            Route::put('/roles/{role}', [RoleController::class, 'apiUpdate'])->middleware(['permission:update_roles']);
            Route::delete('/roles/{role}', [RoleController::class, 'apiDestroy'])->middleware(['permission:delete_roles']);
            Route::post('/roles/bulk-delete', [RoleController::class, 'apiBulkDelete'])->middleware(['permission:delete_roles']);

            // Permission API routes
            Route::get('/permissions', [PermissionController::class, 'apiIndex'])->middleware(['permission:access_permissions']);
            Route::post('/permissions', [PermissionController::class, 'apiStore'])->middleware(['permission:create_permissions']);
            Route::put('/permissions/{permission}', [PermissionController::class, 'apiUpdate'])->middleware(['permission:update_permissions']);
            Route::delete('/permissions/{permission}', [PermissionController::class, 'apiDestroy'])->middleware(['permission:delete_permissions']);
            Route::post('/permissions/bulk-delete', [PermissionController::class, 'apiBulkDelete'])->middleware(['permission:delete_permissions']);
        });
    });

    Route::prefix('projects')->group(function () {
        Route::post('/', [ProjectController::class, 'store'])->name('projects.store')->middleware('permission:create_project');
        Route::post('/import', [ProjectController::class, 'import'])->name('projects.import')->middleware('permission:create_project');
        Route::get('/{project}', [ProjectController::class, 'show'])->name('projects.show')->middleware(EnsureProjectMember::class);

        Route::prefix('{project}')->middleware(EnsureProjectMember::class)->group(function () {
            // Collections routes
            Route::prefix('collections')->group(function () {
                Route::post('/', [CollectionController::class, 'store'])->name('projects.collections.store')->middleware('permission:create_collection');
                Route::post('/import', [CollectionController::class, 'import'])->name('projects.collections.import')->middleware('permission:create_collection');
                Route::get('/{collection}/content', [CollectionController::class, 'show'])->name('projects.collections.show');
                Route::get('/{collection}/edit', [CollectionController::class, 'edit'])->name('projects.collections.edit')->middleware('permission:access_collection_settings');
                Route::put('/{collection}', [CollectionController::class, 'update'])->name('projects.collections.update')->middleware('permission:update_collection');
                Route::delete('/{collection}', [CollectionController::class, 'destroy'])->name('projects.collections.destroy')->middleware('permission:delete_collection');
                Route::post('/reorder', [CollectionController::class, 'reorder'])->name('projects.collections.reorder');

                Route::prefix('{collection}')->group(function () {
                    Route::prefix('fields')->group(function () {
                        Route::post('/', [FieldController::class, 'store'])->name('projects.collections.fields.store')->middleware('permission:create_field');
                        Route::put('/{field}', [FieldController::class, 'update'])->name('projects.collections.fields.update')->middleware('permission:update_field');
                        Route::delete('/{field}', [FieldController::class, 'destroy'])->name('projects.collections.fields.destroy')->middleware('permission:delete_field');
                        Route::post('/reorder', [FieldController::class, 'reorder'])->name('projects.collections.fields.reorder')->middleware('permission:update_field');
                    });

                    Route::prefix('content')->group(function () {
                        Route::get('/create', [ContentController::class, 'create'])->name('projects.collections.content.create')->middleware('permission:create_content');
                        Route::post('/', [ContentController::class, 'store'])->name('projects.collections.content.store')->middleware('permission:create_content');
                        Route::get('/{contentEntry}/edit', [ContentController::class, 'edit'])->name('projects.collections.content.edit')->middleware('permission:update_content');
                        Route::put('/{contentEntry}', [ContentController::class, 'update'])->name('projects.collections.content.update')->middleware('permission:update_content');
                        Route::delete('/{contentEntry}', [ContentController::class, 'destroy'])->name('projects.collections.content.destroy')->middleware('permission:move_content_to_trash');
                        Route::delete('/{contentEntry}/force', [ContentController::class, 'forceDestroy'])->name('projects.collections.content.forceDestroy')->middleware('permission:delete_content');
                        Route::put('/{contentEntry}/publish', [ContentController::class, 'publish'])->name('projects.collections.content.publish')->middleware('permission:publish_content');
                        Route::put('/{contentEntry}/unpublish', [ContentController::class, 'unpublish'])->name('projects.collections.content.unpublish')->middleware('permission:unpublish_content');
                        Route::post('/{contentEntry}/discard-draft', [ContentController::class, 'discardDraft'])->name('projects.collections.content.discardDraft')->middleware('permission:update_content');
                        Route::post('/{contentEntry}/duplicate', [ContentController::class, 'duplicate'])->name('projects.collections.content.duplicate')->middleware('permission:create_content');
                        Route::post('/{contentEntry}/link-translation', [ContentController::class, 'linkTranslation'])->name('projects.collections.content.linkTranslation')->middleware('permission:update_content');
                        Route::post('/{contentEntry}/unlink-translation', [ContentController::class, 'unlinkTranslation'])->name('projects.collections.content.unlinkTranslation')->middleware('permission:update_content');
                        Route::post('/{contentEntry}/translate-with-ai', [ContentController::class, 'translateWithAi'])->name('projects.collections.content.translateWithAi')->middleware('permission:create_content');
                        Route::post('/{contentEntry}/create-translation', [ContentController::class, 'createTranslation'])->name('projects.collections.content.createTranslation')->middleware('permission:create_content');
                        Route::get('/search', [ContentController::class, 'search'])->name('projects.collections.content.search');
                        Route::get('/find', [ContentController::class, 'find'])->name('projects.collections.content.find');

                        Route::get('/relation-collection', [ContentController::class, 'getRelationCollection'])->name('projects.collections.content.getRelationCollection');
                        // Restore soft-deleted content entry
                        Route::put('/{contentEntry}/restore', [ContentController::class, 'restore'])->name('projects.collections.content.restore')->middleware('permission:update_content');

                        // Export/Import content
                        // Export is available to anyone who can view content (no specific permission needed)
                        Route::post('/export', [ContentController::class, 'export'])->name('projects.collections.content.export');
                        Route::post('/import', [ContentController::class, 'import'])->name('projects.collections.content.import')->middleware('permission:create_content');

                        Route::get('/{contentEntry}/versions', [ContentController::class, 'versionsIndex'])->name('projects.collections.content.versions.index');
                        Route::get('/{contentEntry}/versions/{version}', [ContentController::class, 'versionsShow'])
                            ->whereNumber('version')
                            ->name('projects.collections.content.versions.show');
                        Route::post('/{contentEntry}/versions/{version}/revert', [ContentController::class, 'versionsRevert'])
                            ->whereNumber('version')
                            ->name('projects.collections.content.versions.revert');
                        Route::patch('/{contentEntry}/versions/{version}', [ContentController::class, 'versionsUpdate'])
                            ->whereNumber('version')
                            ->name('projects.collections.content.versions.update');
                    });
                });
            });

            // Asset Management Routes
            Route::prefix('assets')->group(function () {
                Route::get('/', [AssetController::class, 'index'])->name('assets.index')->middleware('permission:access_assets');
                Route::post('/upload', [AssetController::class, 'upload'])->name('assets.upload')->middleware('permission:upload_asset');
                Route::post('/upload-url', [AssetController::class, 'directUploadInitiate'])->name('assets.upload-url')->middleware('permission:upload_asset');
                Route::post('/upload-finalize', [AssetController::class, 'directUploadFinalize'])->name('assets.upload-finalize')->middleware('permission:upload_asset');
                Route::post('/multipart/initiate', [AssetController::class, 'directMultipartInitiate'])->name('assets.multipart-initiate')->middleware('permission:upload_asset');
                Route::post('/multipart/part-url', [AssetController::class, 'directMultipartPartUrl'])->name('assets.multipart-part-url')->middleware('permission:upload_asset');
                Route::post('/multipart/complete', [AssetController::class, 'directMultipartComplete'])->name('assets.multipart-complete')->middleware('permission:upload_asset');
                Route::put('/{asset}/crop', [AssetController::class, 'crop'])->name('assets.crop')->middleware('permission:update_asset');
                Route::delete('/{asset}', [AssetController::class, 'destroy'])->name('assets.destroy')->middleware('permission:delete_asset');
                Route::post('/bulk-delete', [AssetController::class, 'bulkDestroy'])->name('assets.bulk-destroy')->middleware('permission:delete_asset');

                // API routes for asset library in content creation
                Route::get('/api/index', [AssetController::class, 'apiIndex'])->name('assets.api.index')->middleware('permission:access_assets');
                Route::get('/api/show/{asset}', [AssetController::class, 'apiShow'])->name('assets.api.show')->middleware('permission:access_assets');
                Route::put('/api/{asset}', [AssetController::class, 'apiUpdate'])->name('assets.api.update')->middleware('permission:update_asset');
                Route::delete('/api/{asset}', [AssetController::class, 'apiDestroy'])->name('assets.api.destroy')->middleware('permission:delete_asset');
            });

            // Project Settings Routes
            Route::prefix('settings')->name('projects.settings.')->group(function () {
                Route::get('/', [ProjectSettingsController::class, 'project'])->name('project')->middleware('permission:access_project_settings');
                Route::get('/localization', [ProjectSettingsController::class, 'localization'])->name('localization')->middleware('permission:access_localization_settings');
                Route::get('/user-access', [ProjectSettingsController::class, 'userAccess'])->name('user-access')->middleware('permission:access_user_access_settings');
                Route::get('/api-access', [ProjectSettingsController::class, 'apiAccess'])->name('api-access')->middleware('permission:access_api_access_settings');
                Route::get('/webhooks', [ProjectSettingsController::class, 'webhooks'])->name('webhooks')->middleware('permission:access_webhooks_settings');
                Route::get('/export-import', [ProjectSettingsController::class, 'exportImport'])->name('export-import')->middleware('permission:access_project_settings');

                // Webhook management API
                Route::prefix('webhooks')->name('webhooks.')->middleware('permission:access_webhooks_settings')->group(function () {
                    Route::get('/api', [WebhookController::class, 'index'])->name('index');
                    Route::post('/api', [WebhookController::class, 'store'])->name('store');
                    Route::put('/api/{webhook}', [WebhookController::class, 'update'])->name('update');
                    Route::delete('/api/{webhook}', [WebhookController::class, 'destroy'])->name('destroy');
                    Route::get('/{webhook}/logs', [WebhookController::class, 'logs'])->name('logs');
                });

                // Localization API endpoints
                Route::prefix('locales')->name('locales.')->group(function () {
                    Route::post('/add', [ProjectSettingsController::class, 'addLocale'])->name('add');
                    Route::delete('/{locale}', [ProjectSettingsController::class, 'deleteLocale'])->name('delete');
                    Route::put('/default', [ProjectSettingsController::class, 'setDefaultLocale'])->name('default');
                });

                // Members API endpoints
                Route::prefix('members')->name('members.')->group(function () {
                    Route::post('/', [ProjectSettingsController::class, 'addMember'])->name('add');
                    Route::delete('/{user}', [ProjectSettingsController::class, 'removeMember'])->name('remove');
                });

                // API Tokens
                Route::prefix('tokens')->name('tokens.')->middleware('permission:access_api_access_settings')->group(function () {
                    Route::post('/', [ProjectSettingsController::class, 'createToken'])->name('create');
                    Route::put('/{token}', [ProjectSettingsController::class, 'updateToken'])->name('update');
                    Route::delete('/{token}', [ProjectSettingsController::class, 'deleteToken'])->name('delete');
                });

                // Toggle public API
                Route::post('/toggle-public', [ProjectSettingsController::class, 'togglePublicApi'])->name('toggle-public')->middleware('permission:access_api_access_settings');

                // Project Auth (End-User Authentication) settings
                Route::prefix('auth')->name('auth.')->middleware('permission:access_auth_settings')->group(function () {
                    Route::get('/', [ProjectAuthSettingsController::class, 'index'])->name('index');
                    Route::get('/users', [ProjectAuthSettingsController::class, 'usersPage'])->name('users.page');
                    Route::get('/sessions', [ProjectAuthSettingsController::class, 'sessionsPage'])->name('sessions.page');
                    Route::get('/api-keys', [ProjectAuthSettingsController::class, 'apiKeysPage'])->name('api-keys.page');
                    Route::get('/audit-log', [ProjectAuthSettingsController::class, 'auditPage'])->name('audit.page');
                    Route::get('/email-verification', [ProjectAuthSettingsController::class, 'emailVerificationPage'])->name('email-verification.page');
                    Route::put('/settings/api', [ProjectAuthSettingsController::class, 'settingsUpdate'])->name('settings.update');

                    Route::get('/users/api', [ProjectAuthSettingsController::class, 'usersIndex'])->name('users.index');
                    Route::post('/users/api', [ProjectAuthSettingsController::class, 'usersStore'])->name('users.store');
                    Route::put('/users/api/{authUser}', [ProjectAuthSettingsController::class, 'usersUpdate'])->name('users.update');
                    Route::delete('/users/api/{authUser}', [ProjectAuthSettingsController::class, 'usersDestroy'])->name('users.destroy');
                    Route::post('/users/api/{authUser}/resend-verification', [ProjectAuthSettingsController::class, 'usersResendVerification'])->name('users.resend-verification');

                    Route::get('/sessions/api', [ProjectAuthSettingsController::class, 'sessionsIndex'])->name('sessions.index');
                    Route::post('/sessions/api/{session}/revoke', [ProjectAuthSettingsController::class, 'sessionsRevoke'])->name('sessions.revoke');

                    Route::get('/audit/api', [ProjectAuthSettingsController::class, 'auditIndex'])->name('audit.index');

                    Route::get('/api-keys/api', [ProjectAuthSettingsController::class, 'apiKeysIndex'])->name('api-keys.index');
                    Route::post('/api-keys/api', [ProjectAuthSettingsController::class, 'apiKeysStore'])->name('api-keys.store');
                    Route::put('/api-keys/api/{apiKey}', [ProjectAuthSettingsController::class, 'apiKeysUpdate'])->name('api-keys.update');
                    Route::post('/api-keys/api/{apiKey}/revoke', [ProjectAuthSettingsController::class, 'apiKeysRevoke'])->name('api-keys.revoke');
                    Route::delete('/api-keys/api/{apiKey}', [ProjectAuthSettingsController::class, 'apiKeysDestroy'])->name('api-keys.destroy');
                });

                // Export/Import API endpoints
                Route::prefix('export-import')->name('export-import.')->middleware('permission:access_project_settings')->group(function () {
                    Route::post('/export-project', [ProjectSettingsController::class, 'exportProject'])->name('export-project');
                    Route::post('/export-collection/{collection}', [ProjectSettingsController::class, 'exportCollection'])->name('export-collection');
                });
            });

            // Update route for project
            Route::put('/', [ProjectController::class, 'update'])->name('projects.update');
            Route::delete('/', [ProjectController::class, 'destroy'])->name('projects.destroy')->middleware('permission:delete_project');
        });

        // Clone project (structure only)
        Route::post('/{project}/clone', [ProjectController::class, 'cloneProject'])->name('projects.clone')->middleware('permission:create_project');
    });

    // Collection templates endpoints
    Route::get('/collection-templates', [CollectionTemplateController::class, 'index'])->name('collection-templates.index');
    Route::post('/projects/{project}/collections/{collection}/save-template', [CollectionTemplateController::class, 'storeFromCollection'])
        ->middleware([EnsureProjectMember::class, 'permission:access_collection_settings'])
        ->name('collections.saveAsTemplate');
    // Project templates endpoints
    Route::get('/project-templates', [ProjectTemplateController::class, 'index'])->name('project-templates.index');
    Route::post('/projects/{project}/save-template', [ProjectTemplateController::class, 'storeFromProject'])
        ->name('projects.saveAsTemplate')
        ->middleware([EnsureProjectMember::class, 'permission:access_project_settings']);
});

// AI Chat
Route::middleware(['auth', 'verified'])->prefix('admin/ai')->name('ai.')->group(function () {
    Route::post('/chat', [AiChatController::class, 'stream'])->name('chat');
    Route::post('/content', [ContentAiController::class, 'stream'])->name('content');
    Route::get('/conversations', [AiChatController::class, 'conversations'])->name('conversations');
    Route::get('/conversations/{conversationId}', [AiChatController::class, 'messages'])->name('conversations.messages');
    Route::delete('/conversations/{conversationId}', [AiChatController::class, 'destroyConversation'])->name('conversations.destroy');
});

// Global (app-wide) settings: profile, password, appearance, app branding, AI and theme.
Route::middleware('auth')->prefix('admin')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('admin/settings/appearance');
    })->name('appearance');

    // App settings (branding)
    Route::get('settings/app', [AppSettingsController::class, 'edit'])->name('settings.app.edit');
    Route::post('settings/app', [AppSettingsController::class, 'update'])->name('settings.app.update');

    // AI settings
    Route::get('settings/ai', [AppSettingsController::class, 'aiEdit'])->name('settings.ai.edit');
    Route::post('settings/ai', [AppSettingsController::class, 'aiUpdate'])->name('settings.ai.update');

    // Theme settings
    Route::get('settings/theme', [AppSettingsController::class, 'themeEdit'])->name('settings.theme.edit');
    Route::post('settings/theme', [AppSettingsController::class, 'themeUpdate'])->name('settings.theme.update');
});
