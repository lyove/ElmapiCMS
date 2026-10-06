<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('project update ensures new default locale is included in locales', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)->put(route('projects.update', ['project' => $project], absolute: false), [
        'name' => 'Locale Shift',
        'default_locale' => 'tr',
        'description' => 'updating locale',
    ]);

    $response->assertRedirect(route('projects.settings.project', ['project' => $project], absolute: false));

    $project->refresh();
    expect($project->default_locale)->toBe('tr');
    expect($project->locales)->toContain('tr');
});

test('add locale normalizes spacing and casing and prevents normalized duplicates', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->post(route('projects.settings.locales.add', ['project' => $project], absolute: false), [
            'locale' => ' TR ',
        ])
        ->assertOk()
        ->assertJsonPath('default_locale', 'en');

    $this->actingAs($user)
        ->post(route('projects.settings.locales.add', ['project' => $project], absolute: false), [
            'locale' => 'tr',
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Locale already exists');

    $project->refresh();
    expect($project->locales)->toContain('tr');
});
