<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $this->get('/')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $response = $this->get(route('dashboard', absolute: false));

    $response->assertOk();
});
