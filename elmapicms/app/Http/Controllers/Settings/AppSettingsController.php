<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppSettingsController extends Controller
{
    /**
     * @var array<int, string>
     */
    protected array $themeTokenAllowList = [
        'background',
        'foreground',
        'card',
        'card-foreground',
        'popover',
        'popover-foreground',
        'primary',
        'primary-foreground',
        'secondary',
        'secondary-foreground',
        'muted',
        'muted-foreground',
        'accent',
        'accent-foreground',
        'destructive',
        'destructive-foreground',
        'border',
        'input',
        'ring',
        'chart-1',
        'chart-2',
        'chart-3',
        'chart-4',
        'chart-5',
        'sidebar',
        'sidebar-foreground',
        'sidebar-primary',
        'sidebar-primary-foreground',
        'sidebar-accent',
        'sidebar-accent-foreground',
        'sidebar-border',
        'sidebar-ring',
        'radius',
        'spacing',
        'tracking-normal',
        'shadow-2xs',
        'shadow-xs',
        'shadow-sm',
        'shadow',
        'shadow-md',
        'shadow-lg',
        'shadow-xl',
        'shadow-2xl',
    ];

    /**
     * @return array<string, array{label: string, css_family: string, href: string, provider: string}>
     */
    protected function fontOptions(): array
    {
        /** @var array<string, array{label: string, css_family: string, href: string, provider: string}> $options */
        $options = config('app-fonts.options', []);

        return $options;
    }

    protected function defaultFontFamily(): string
    {
        return config('app-fonts.default', 'instrument-sans');
    }

    /**
     * @return array<string, array{label: string, css_value: string}>
     */
    protected function radiusOptions(): array
    {
        /** @var array<string, array{label: string, css_value: string}> $options */
        $options = config('app-radius.options', []);

        return $options;
    }

    protected function defaultThemeRadius(): string
    {
        return config('app-radius.default', 'md');
    }

    /**
     * Resolve a stored radius key from a CSS radius value (e.g. from theme tokens).
     */
    protected function resolveThemeRadiusKey(?string $cssValue): string
    {
        if ($cssValue === null || $cssValue === '') {
            return $this->defaultThemeRadius();
        }

        $normalized = strtolower(preg_replace('/\s+/', '', $cssValue) ?? '');

        if (in_array($normalized, ['0', '0px', '0rem'], true)) {
            return 'none';
        }

        foreach ($this->radiusOptions() as $key => $option) {
            $optionValue = strtolower(preg_replace('/\s+/', '', $option['css_value']) ?? '');
            if ($optionValue === $normalized) {
                return $key;
            }
        }

        return $this->defaultThemeRadius();
    }

    /**
     * @param  array{light: array<string, string>, dark: array<string, string>}  $tokens
     * @return array{light: array<string, string>, dark: array<string, string>}
     */
    protected function applyRadiusToThemeTokens(array $tokens, string $radiusKey): array
    {
        $cssValue = $this->radiusOptions()[$radiusKey]['css_value'] ?? $this->radiusOptions()[$this->defaultThemeRadius()]['css_value'] ?? '0.5rem';

        if ($tokens['light'] !== []) {
            $tokens['light']['radius'] = $cssValue;
        }

        if ($tokens['dark'] !== []) {
            $tokens['dark']['radius'] = $cssValue;
        }

        if ($tokens['light'] === [] && $tokens['dark'] === []) {
            $tokens['light']['radius'] = $cssValue;
        }

        return $tokens;
    }

    /**
     * @param  array<string, mixed>|null  $themeTokens
     */
    protected function buildThemeCssFromTokens(?array $themeTokens): string
    {
        $lightTokens = collect($themeTokens['light'] ?? [])->filter(fn (mixed $value): bool => is_string($value));
        $darkTokens = collect($themeTokens['dark'] ?? [])->filter(fn (mixed $value): bool => is_string($value));

        if ($lightTokens->isEmpty() && $darkTokens->isEmpty()) {
            return '';
        }

        return trim(implode("\n\n", array_filter([
            $this->renderTokenBlock(':root', $lightTokens),
            $this->renderTokenBlock('.dark', $darkTokens),
        ])));
    }

    protected function renderTokenBlock(string $selector, Collection $tokens): string
    {
        if ($tokens->isEmpty()) {
            return '';
        }

        $lines = $tokens
            ->map(fn (string $value, string $key): string => "  --{$key}: {$value};")
            ->implode("\n");

        return "{$selector} {\n{$lines}\n}";
    }

    /**
     * @return array{light: array<string, string>, dark: array<string, string>}
     */
    protected function extractThemeTokens(string $themeCss): array
    {
        $themeCss = str_replace("\r\n", "\n", $themeCss);
        $tokens = [
            'light' => $this->extractThemeTokensForSelector($themeCss, ':root'),
            'dark' => $this->extractThemeTokensForSelector($themeCss, '.dark'),
        ];

        return $tokens;
    }

    /**
     * @return array<string, string>
     */
    protected function extractThemeTokensForSelector(string $themeCss, string $selector): array
    {
        $selectorPattern = preg_quote($selector, '/');

        if (! preg_match("/{$selectorPattern}\s*\{([\s\S]*?)\}/", $themeCss, $matches)) {
            return [];
        }

        $body = $matches[1] ?? '';
        $tokens = [];

        if (! preg_match_all('/--([a-z0-9-]+)\s*:\s*([^;{}]+);/i', $body, $declarations, PREG_SET_ORDER)) {
            return [];
        }

        foreach ($declarations as $declaration) {
            $rawKey = strtolower(trim($declaration[1] ?? ''));
            $rawValue = trim($declaration[2] ?? '');

            if (! in_array($rawKey, $this->themeTokenAllowList, true)) {
                continue;
            }

            if (! preg_match('/^[a-zA-Z0-9\s\.\,\-\+\/%\(\)#\'":]+$/', $rawValue)) {
                continue;
            }

            $tokens[$rawKey] = $rawValue;
        }

        return $tokens;
    }

    /**
     * @return array<string, array{label: string}>
     */
    protected function themeTokenLabels(): array
    {
        return collect($this->themeTokenAllowList)
            ->mapWithKeys(fn (string $token): array => [$token => ['label' => str($token)->replace('-', ' ')->title()->value()]])
            ->all();
    }

    /**
     * @return array<int, array{key: string, label: string, theme_css: string}>
     */
    protected function themePresets(): array
    {
        $directory = resource_path('data/theme-presets');
        if (! File::isDirectory($directory)) {
            return [];
        }

        return collect(File::files($directory))
            ->filter(fn (\SplFileInfo $file): bool => $file->getExtension() === 'json')
            ->map(function (\SplFileInfo $file): ?array {
                $decoded = json_decode(File::get($file->getRealPath()), true);
                if (! is_array($decoded)) {
                    return null;
                }

                return [
                    'key' => (string) ($decoded['key'] ?? ''),
                    'label' => (string) ($decoded['label'] ?? ''),
                    'theme_css' => (string) ($decoded['theme_css'] ?? ''),
                ];
            })
            ->filter(fn (mixed $preset): bool => is_array($preset))
            ->filter(fn (array $preset): bool => $preset['key'] !== '' && $preset['label'] !== '' && $preset['theme_css'] !== '')
            ->sortBy(fn (array $preset): string => mb_strtolower($preset['label']))
            ->values()
            ->all();
    }

    public function edit(): Response
    {
        $settings = AppSetting::query()->latest('id')->first();

        return Inertia::render('admin/settings/app', [
            'settings' => [
                'app_name' => $settings?->app_name ?? null,
                'logo_file' => $settings?->logo_file ? Storage::disk('public')->url($settings->logo_file) : null,
                'favicon_file' => $settings?->favicon_file ? Storage::disk('public')->url($settings->favicon_file) : null,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'app_name' => ['nullable', 'string', 'max:255'],
            'logo' => ['nullable', 'file', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
            'favicon' => ['nullable', 'file', 'mimes:ico,png,jpg,gif,svg', 'max:1024'],
            'remove_logo' => ['nullable', 'boolean'],
            'remove_favicon' => ['nullable', 'boolean'],
        ]);

        $settings = AppSetting::query()->latest('id')->first();
        if (! $settings) {
            $settings = new AppSetting;
        }

        // Handle logo upload or removal
        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($settings->logo_file && Storage::disk('public')->exists($settings->logo_file)) {
                Storage::disk('public')->delete($settings->logo_file);
            }

            $file = $request->file('logo');
            $originalFilename = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();

            // Generate unique filename
            $filename = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)).'_'.Str::random(8).'.'.$extension;

            // Store file in app-settings directory
            $path = 'app-settings';
            $filePath = $file->storeAs($path, $filename, 'public');

            $validated['logo_file'] = $filePath;
        } elseif ($request->boolean('remove_logo') && $settings->logo_file) {
            // Remove existing logo
            if (Storage::disk('public')->exists($settings->logo_file)) {
                Storage::disk('public')->delete($settings->logo_file);
            }
            $validated['logo_file'] = null;
        }

        // Handle favicon upload or removal
        if ($request->hasFile('favicon')) {
            // Delete old favicon if exists
            if ($settings->favicon_file && Storage::disk('public')->exists($settings->favicon_file)) {
                Storage::disk('public')->delete($settings->favicon_file);
            }

            $file = $request->file('favicon');
            $originalFilename = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();

            // Generate unique filename
            $filename = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)).'_'.Str::random(8).'.'.$extension;

            // Store file in app-settings directory
            $path = 'app-settings';
            $filePath = $file->storeAs($path, $filename, 'public');

            $validated['favicon_file'] = $filePath;
        } elseif ($request->boolean('remove_favicon') && $settings->favicon_file) {
            // Remove existing favicon
            if (Storage::disk('public')->exists($settings->favicon_file)) {
                Storage::disk('public')->delete($settings->favicon_file);
            }
            $validated['favicon_file'] = null;
        }

        $settings->fill($validated);
        $settings->save();

        return to_route('settings.app.edit');
    }

    public function aiEdit(): Response
    {
        $settings = AppSetting::query()->latest('id')->first();

        // Check which providers have API keys configured
        $configuredProviders = collect(config('ai.providers'))
            ->filter(fn ($provider) => ! empty($provider['key']))
            ->keys()
            ->values()
            ->all();

        return Inertia::render('admin/settings/ai', [
            'settings' => [
                'ai_enabled' => $settings?->ai_enabled ?? false,
                'ai_provider' => $settings?->ai_provider ?? 'anthropic',
                'ai_model' => $settings?->ai_model,
                'ai_show_token_usage' => $settings?->ai_show_token_usage ?? false,
                'ai_max_conversation_messages' => $settings?->ai_max_conversation_messages ?? 10,
                'ai_max_tokens' => $settings?->ai_max_tokens ?? 4096,
                'ai_max_steps' => $settings?->ai_max_steps ?? 8,
            ],
            'configured_providers' => $configuredProviders,
        ]);
    }

    public function aiUpdate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ai_enabled' => ['required', 'boolean'],
            'ai_provider' => ['required', 'string', 'in:anthropic,openai,gemini,deepseek,groq,mistral,xai,ollama,openrouter'],
            'ai_model' => ['nullable', 'string', 'max:255'],
            'ai_show_token_usage' => ['required', 'boolean'],
            'ai_max_conversation_messages' => ['required', 'integer', 'min:2', 'max:100'],
            'ai_max_tokens' => ['required', 'integer', 'min:256', 'max:128000'],
            'ai_max_steps' => ['required', 'integer', 'min:1', 'max:30'],
        ]);

        $settings = AppSetting::query()->latest('id')->first();
        if (! $settings) {
            $settings = new AppSetting;
        }

        $settings->fill($validated);
        $settings->save();

        return to_route('settings.ai.edit');
    }

    public function themeEdit(): Response
    {
        $settings = AppSetting::query()->latest('id')->first();
        $activeThemeTokens = is_array($settings?->theme_tokens) ? $settings->theme_tokens : null;
        $customThemeTokens = is_array($settings?->theme_custom_tokens) ? $settings->theme_custom_tokens : null;
        $fontOptions = $this->fontOptions();
        $radiusOptions = $this->radiusOptions();
        $themePresets = $this->themePresets();
        $currentPresetKey = $settings?->theme_preset_key ?? ($themePresets[0]['key'] ?? 'custom');
        $activeThemeCss = $this->buildThemeCssFromTokens($activeThemeTokens);
        $customThemeCss = $this->buildThemeCssFromTokens($customThemeTokens);
        $themeRadius = $settings?->theme_radius
            ?? $this->resolveThemeRadiusKey(is_string(data_get($activeThemeTokens, 'light.radius')) ? data_get($activeThemeTokens, 'light.radius') : null);

        return Inertia::render('admin/settings/theme', [
            'settings' => [
                'font_family' => $settings?->font_family ?? $this->defaultFontFamily(),
                'theme_radius' => $themeRadius,
                'current_preset_key' => $currentPresetKey,
                'theme_css' => $activeThemeCss,
                'custom_theme_css' => $customThemeCss,
                'has_custom_theme' => $customThemeCss !== '',
            ],
            'font_options' => collect($fontOptions)
                ->map(fn (array $font, string $value): array => [
                    'value' => $value,
                    'label' => $font['label'],
                ])
                ->values(),
            'radius_options' => collect($radiusOptions)
                ->map(fn (array $radius, string $value): array => [
                    'value' => $value,
                    'label' => $radius['label'],
                ])
                ->values(),
            'theme_presets' => $themePresets,
            'supported_tokens' => $this->themeTokenLabels(),
        ]);
    }

    public function themeUpdate(Request $request): RedirectResponse
    {
        $allowedFonts = array_keys($this->fontOptions());
        $allowedRadii = array_keys($this->radiusOptions());
        $themePresets = collect($this->themePresets());
        $presetKeys = $themePresets->pluck('key')->values()->all();
        $allowedPresetKeys = [...$presetKeys, 'custom'];
        $validated = $request->validate([
            'font_family' => ['nullable', 'string', Rule::in($allowedFonts)],
            'theme_radius' => ['nullable', 'string', Rule::in($allowedRadii)],
            'preset_key' => ['nullable', 'string', Rule::in($allowedPresetKeys)],
            'theme_css' => ['nullable', 'string', 'max:50000'],
            'clear_theme' => ['nullable', 'boolean'],
        ]);

        $settings = AppSetting::query()->latest('id')->first();
        if (! $settings) {
            $settings = new AppSetting;
        }

        $requestedFontFamily = $validated['font_family'] ?? $settings->font_family ?? $this->defaultFontFamily();
        $requestedThemeRadius = $validated['theme_radius'] ?? $settings->theme_radius ?? $this->defaultThemeRadius();
        $selectedPreset = $themePresets->firstWhere('key', $validated['preset_key'] ?? null);
        $themeCss = trim((string) ($selectedPreset['theme_css'] ?? ($validated['theme_css'] ?? '')));

        if (($validated['clear_theme'] ?? false) === true || $themeCss === '') {
            $settings->theme_tokens = null;
            $settings->theme_custom_tokens = null;
            $settings->theme_preset_key = null;
            $settings->font_family = $requestedFontFamily;
            $settings->theme_radius = $requestedThemeRadius;
            $settings->save();

            return to_route('settings.theme.edit');
        }

        if ($selectedPreset && ($validated['preset_key'] ?? null) !== 'custom') {
            $presetTokens = $this->applyRadiusToThemeTokens(
                $this->extractThemeTokens($selectedPreset['theme_css']),
                $requestedThemeRadius,
            );

            $settings->font_family = $requestedFontFamily;
            $settings->theme_radius = $requestedThemeRadius;
            $settings->theme_tokens = $presetTokens;
            $settings->theme_preset_key = $selectedPreset['key'];
            $settings->save();

            return to_route('settings.theme.edit');
        }

        $tokens = $this->extractThemeTokens($themeCss);
        $hasTokens = ! empty($tokens['light']) || ! empty($tokens['dark']);

        if (! $hasTokens) {
            return back()
                ->withErrors(['theme_css' => 'No valid theme tokens were found. Paste a :root/.dark block from tweakcn.'])
                ->withInput();
        }

        $tokens = $this->applyRadiusToThemeTokens($tokens, $requestedThemeRadius);

        $settings->font_family = $requestedFontFamily;
        $settings->theme_radius = $requestedThemeRadius;
        $settings->theme_tokens = $tokens;
        $settings->theme_custom_tokens = $tokens;
        $settings->theme_preset_key = 'custom';
        $settings->save();

        return to_route('settings.theme.edit');
    }
}
