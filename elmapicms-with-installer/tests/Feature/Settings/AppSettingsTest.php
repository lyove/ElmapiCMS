<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('app settings page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/app');

    $response->assertOk();
});

test('app settings can store branding fields', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post('/settings/app', [
            'app_name' => 'Elmapi',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/app');
});
