<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: var(--background, oklch(1 0 0));
            }

            html.dark {
                background-color: var(--background, oklch(0.145 0 0));
            }
        </style>

        <title inertia>{{ data_get($page, 'props.branding.app_name', config('app.name', 'Laravel')) }}</title>

        @php
            $favicon = data_get($page, 'props.branding.favicon_url');
            $fontOptions = config('app-fonts.options', []);
            $defaultFontKey = config('app-fonts.default', 'instrument-sans');
            $selectedFontKey = data_get($page, 'props.branding.font_family', $defaultFontKey);
            $selectedFont = $fontOptions[$selectedFontKey] ?? ($fontOptions[$defaultFontKey] ?? null);
            $selectedFontProvider = $selectedFont['provider'] ?? null;
            $selectedFontHref = $selectedFont['href'] ?? null;
            $selectedFontCssFamily = $selectedFont['css_family'] ?? "'Instrument Sans'";
            $radiusOptions = config('app-radius.options', []);
            $defaultRadiusKey = config('app-radius.default', 'md');
            $selectedRadiusKey = data_get($page, 'props.branding.theme_radius', $defaultRadiusKey);
            $selectedRadius = $radiusOptions[$selectedRadiusKey] ?? ($radiusOptions[$defaultRadiusKey] ?? null);
            $selectedRadiusCssValue = $selectedRadius['css_value'] ?? '0.5rem';
            $themeTokens = data_get($page, 'props.branding.theme_tokens');
            $themeLightTokens = is_array(data_get($themeTokens, 'light')) ? data_get($themeTokens, 'light') : [];
            $themeDarkTokens = is_array(data_get($themeTokens, 'dark')) ? data_get($themeTokens, 'dark') : [];
            unset($themeLightTokens['radius'], $themeDarkTokens['radius']);
            $renderTokenLines = function (array $tokens): string {
                if (empty($tokens)) {
                    return '';
                }

                return collect($tokens)
                    ->map(fn (string $value, string $key): string => "--{$key}: {$value} !important;")
                    ->implode("\n                ");
            };
            $themeLightTokenLines = $renderTokenLines($themeLightTokens);
            $themeDarkTokenLines = $renderTokenLines($themeDarkTokens);
        @endphp

        @if($favicon)
            <link rel="icon" href="{{ $favicon }}">
        @else
            <link rel="icon" href="/favicon.ico" sizes="any">
            <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        @endif

        @if($selectedFontProvider === 'bunny')
            <link rel="preconnect" href="https://fonts.bunny.net">
        @elseif($selectedFontProvider === 'google')
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        @endif

        @if($selectedFontHref)
            <link href="{{ $selectedFontHref }}" rel="stylesheet" />
        @endif

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        {{-- Apply branding after Vite CSS so runtime theme tokens win over app.css defaults. --}}
        <style id="app-branding-tokens">
            :root {
                --app-font-sans: {!! $selectedFontCssFamily !!};
                --radius: {{ $selectedRadiusCssValue }} !important;
            }
        </style>
        @if($themeLightTokenLines || $themeDarkTokenLines)
            <style id="app-theme-tokens">
                @if($themeLightTokenLines)
                    :root {
                        {!! $themeLightTokenLines !!}
                    }
                @endif

                @if($themeDarkTokenLines)
                    .dark {
                        {!! $themeDarkTokenLines !!}
                    }
                @endif
            </style>
        @endif
        @inertiaHead
    </head>
    <body class="font-sans antialiased" style="font-family: var(--app-font-sans), ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';">
        @inertia
    </body>
</html>
