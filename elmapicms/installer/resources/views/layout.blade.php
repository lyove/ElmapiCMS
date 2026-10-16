@php
    $installerCss = (string) file_get_contents(base_path('installer/resources/assets/install.css'));
    $installerLogo = 'data:image/svg+xml;base64,'.base64_encode((string) file_get_contents(base_path('installer/resources/assets/logo.svg')));
    $installerFavicon = 'data:image/svg+xml;base64,'.base64_encode((string) file_get_contents(base_path('installer/resources/assets/favicon.svg')));
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Install') — ElmapiCMS</title>
    <link rel="icon" href="{{ $installerFavicon }}" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet">
    <style>{!! $installerCss !!}</style>
</head>
<body>
<div class="shell">
    <div class="brand">
        <div class="brand-mark">
            <img src="{{ $installerLogo }}" width="32" height="32" alt="ElmapiCMS">
        </div>
        <div class="brand-text">
            <strong>ElmapiCMS</strong>
            <span>Web installer</span>
        </div>
    </div>
    <div class="card">
        @yield('content')
    </div>
</div>
</body>
</html>
