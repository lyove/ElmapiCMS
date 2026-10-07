<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use App\Services\DirectAssetUploadService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $appSettings = AppSetting::query()->latest('id')->first();

        /** @var array<string, array{label: string, css_value: string}> $radiusOptions */
        $radiusOptions = config('app-radius.options', []);
        $defaultRadiusKey = config('app-radius.default', 'md');
        $themeRadiusKey = is_string($appSettings?->theme_radius) && isset($radiusOptions[$appSettings->theme_radius])
            ? $appSettings->theme_radius
            : $defaultRadiusKey;

        if ($themeRadiusKey === $defaultRadiusKey && is_string(data_get($appSettings?->theme_tokens, 'light.radius'))) {
            $tokenRadius = strtolower(preg_replace('/\s+/', '', (string) data_get($appSettings->theme_tokens, 'light.radius')) ?? '');
            if (in_array($tokenRadius, ['0', '0px', '0rem'], true)) {
                $themeRadiusKey = 'none';
            } else {
                foreach ($radiusOptions as $key => $option) {
                    $optionValue = strtolower(preg_replace('/\s+/', '', $option['css_value']) ?? '');
                    if ($optionValue === $tokenRadius) {
                        $themeRadiusKey = $key;
                        break;
                    }
                }
            }
        }

        $branding = [
            'app_name' => $appSettings?->app_name ?? config('app.name'),
            'logo_url' => $appSettings?->logo_file ? Storage::disk('public')->url($appSettings->logo_file) : '/logo.svg',
            'favicon_url' => $appSettings?->favicon_file ? Storage::disk('public')->url($appSettings->favicon_file) : '/favicon.svg',
            'font_family' => $appSettings?->font_family ?? config('app-fonts.default', 'instrument-sans'),
            'theme_radius' => $themeRadiusKey,
            'theme_radius_css' => $radiusOptions[$themeRadiusKey]['css_value'] ?? ($radiusOptions[$defaultRadiusKey]['css_value'] ?? '0.5rem'),
            'theme_tokens' => is_array($appSettings?->theme_tokens) ? $appSettings->theme_tokens : null,
        ];

        return [
            ...parent::share($request),
            'name' => $branding['app_name'],
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'branding' => $branding,
            'userCan' => $request->user() ? (function () use ($request) {
                $map = [];
                foreach ($request->user()->getAllPermissions()->pluck('name') as $perm) {
                    $map[$perm] = true;
                }

                return $map;
            })() : [],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            // Automatically close the main sidebar on project-specific pages to give more room to the project workspace.
            // The explicit query string parameter is kept for flexibility and the cookie still controls the sidebar on other pages.
            'sidebarOpen' => $request->routeIs('projects.*') || $request->routeIs('assets.*')
                ? false
                : (! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true'),

            'awsCredentialsConfigured' => env('AWS_ACCESS_KEY_ID') && env('AWS_SECRET_ACCESS_KEY'),
            'aiEnabled' => $appSettings?->ai_enabled ?? false,
            'aiShowTokenUsage' => $appSettings?->ai_show_token_usage ?? false,
            'assetDirectUpload' => [
                'enabled' => DirectAssetUploadService::isEnabled(),
                'multipart_threshold_bytes' => (int) config('assets.direct_upload.multipart_threshold_bytes', 100 * 1024 * 1024),
            ],
        ];
    }
}
