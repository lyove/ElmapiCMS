<?php

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('theme settings page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/theme');

    $response->assertOk();
});

test('theme roundness is applied in document head', function () {
    $user = User::factory()->create();

    AppSetting::query()->create([
        'theme_radius' => 'none',
    ]);

    $response = $this
        ->actingAs($user)
        ->get('/settings/theme');

    $response
        ->assertOk()
        ->assertSee('id="app-branding-tokens"', false)
        ->assertSee('--radius: 0px !important', false)
        ->assertInertia(fn ($page) => $page
            ->where('branding.theme_radius', 'none')
            ->where('branding.theme_radius_css', '0px'));
});

test('theme settings can store tokens from pasted css', function () {
    $user = User::factory()->create();

    $themeCss = <<<'CSS'
:root {
  --background: oklch(0.9940 0 0);
  --foreground: oklch(0 0 0);
  --radius: 1.4rem;
  --font-sans: Plus Jakarta Sans, sans-serif;
}

.dark {
  --background: oklch(0.2223 0.0060 271.1393);
  --foreground: oklch(0.9551 0 0);
}
CSS;

    $response = $this
        ->actingAs($user)
        ->post('/settings/theme', [
            'font_family' => 'inter',
            'theme_radius' => '2xl',
            'theme_css' => $themeCss,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/theme');

    $settings = AppSetting::query()->latest('id')->first();

    expect($settings)->not->toBeNull();
    expect($settings?->font_family)->toBe('inter');
    expect($settings?->theme_radius)->toBe('2xl');
    expect($settings?->theme_tokens['light']['background'] ?? null)->toBe('oklch(0.9940 0 0)');
    expect($settings?->theme_tokens['light']['radius'] ?? null)->toBe('1.4rem');
    expect($settings?->theme_tokens['dark']['background'] ?? null)->toBe('oklch(0.2223 0.0060 271.1393)');
    expect($settings?->theme_tokens['light']['font-sans'] ?? null)->toBeNull();
});

test('theme settings can apply a preset from json file', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post('/settings/theme', [
            'font_family' => 'inter',
            'theme_radius' => 'lg',
            'preset_key' => 'violet-bloom',
            'theme_css' => '',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/theme');

    $settings = AppSetting::query()->latest('id')->first();

    expect($settings)->not->toBeNull();
    expect($settings?->font_family)->toBe('inter');
    expect($settings?->theme_radius)->toBe('lg');
    expect($settings?->theme_tokens['light']['radius'] ?? null)->toBe('0.75rem');
    expect($settings?->theme_tokens['dark']['primary'] ?? null)->toBe('oklch(0.6132 0.2294 291.7437)');
    expect($settings?->theme_preset_key)->toBe('violet-bloom');
});

test('theme settings rejects css without supported tokens', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/theme')
        ->post('/settings/theme', [
            'font_family' => 'inter',
            'theme_css' => '.demo { color: red; }',
        ]);

    $response
        ->assertSessionHasErrors('theme_css')
        ->assertRedirect('/settings/theme');
});

test('theme settings can be reset to defaults', function () {
    $user = User::factory()->create();
    AppSetting::query()->create([
        'theme_tokens' => [
            'light' => ['background' => 'oklch(0.9940 0 0)'],
            'dark' => ['background' => 'oklch(0.2223 0.0060 271.1393)'],
        ],
        'theme_custom_tokens' => [
            'light' => ['background' => 'oklch(0.9940 0 0)'],
            'dark' => ['background' => 'oklch(0.2223 0.0060 271.1393)'],
        ],
        'theme_preset_key' => 'custom',
    ]);

    $response = $this
        ->actingAs($user)
        ->post('/settings/theme', [
            'clear_theme' => true,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/theme');

    $settings = AppSetting::query()->latest('id')->first();
    expect($settings?->theme_tokens)->toBeNull();
    expect($settings?->theme_custom_tokens)->toBeNull();
    expect($settings?->theme_preset_key)->toBeNull();
});

test('theme settings reject unsupported font family', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/theme')
        ->post('/settings/theme', [
            'font_family' => 'unknown-font',
            'theme_css' => ':root { --background: oklch(0.9940 0 0); }',
        ]);

    $response
        ->assertSessionHasErrors('font_family')
        ->assertRedirect('/settings/theme');
});

test('theme settings can store roundness independently of presets', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/settings/theme', [
        'font_family' => 'inter',
        'theme_radius' => 'none',
        'preset_key' => 'violet-bloom',
        'theme_css' => '',
    ])->assertSessionHasNoErrors();

    $settings = AppSetting::query()->latest('id')->first();
    expect($settings?->theme_radius)->toBe('none');
    expect($settings?->theme_tokens['light']['radius'] ?? null)->toBe('0px');

    $this->actingAs($user)->post('/settings/theme', [
        'font_family' => 'inter',
        'theme_radius' => 'xl',
        'clear_theme' => true,
    ])->assertSessionHasNoErrors();

    $settings->refresh();
    expect($settings->theme_tokens)->toBeNull();
    expect($settings->theme_radius)->toBe('xl');
});

test('theme settings reject unsupported roundness', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/theme')
        ->post('/settings/theme', [
            'font_family' => 'inter',
            'theme_radius' => 'pill',
            'theme_css' => ':root { --background: oklch(0.9940 0 0); }',
        ]);

    $response
        ->assertSessionHasErrors('theme_radius')
        ->assertRedirect('/settings/theme');
});

test('custom theme is preserved when switching preset and back to custom', function () {
    $user = User::factory()->create();

    $customCss = <<<'CSS'
:root {
  --background: oklch(0.91 0.01 260);
  --primary: oklch(0.62 0.2 280);
}

.dark {
  --background: oklch(0.2 0.01 260);
  --primary: oklch(0.7 0.2 280);
}
CSS;

    $this->actingAs($user)->post('/settings/theme', [
        'font_family' => 'inter',
        'preset_key' => 'custom',
        'theme_css' => $customCss,
    ])->assertSessionHasNoErrors();

    $this->actingAs($user)->post('/settings/theme', [
        'font_family' => 'inter',
        'preset_key' => 'violet-bloom',
        'theme_css' => '',
    ])->assertSessionHasNoErrors();

    $this->actingAs($user)->post('/settings/theme', [
        'font_family' => 'inter',
        'preset_key' => 'custom',
        'theme_css' => $customCss,
    ])->assertSessionHasNoErrors();

    $settings = AppSetting::query()->latest('id')->first();
    expect($settings?->theme_preset_key)->toBe('custom');
    expect($settings?->theme_custom_tokens['light']['background'] ?? null)->toBe('oklch(0.91 0.01 260)');
    expect($settings?->theme_tokens['light']['background'] ?? null)->toBe('oklch(0.91 0.01 260)');
});
