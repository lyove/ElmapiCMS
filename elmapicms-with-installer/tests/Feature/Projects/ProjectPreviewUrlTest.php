<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('members can update project preview url', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'preview_url' => null,
    ]);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)->put(route('projects.update', ['project' => $project], absolute: false), [
        'name' => $project->name,
        'default_locale' => $project->default_locale,
        'description' => $project->description,
        'preview_url' => 'https://preview.example.com/site',
    ]);

    $response->assertRedirect(route('projects.settings.project', ['project' => $project], absolute: false));

    $project->refresh();
    expect($project->preview_url)->toBe('https://preview.example.com/site');
});

test('project update rejects invalid preview urls', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'preview_url' => 'https://valid.example.com',
    ]);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)->put(route('projects.update', ['project' => $project], absolute: false), [
        'name' => $project->name,
        'default_locale' => $project->default_locale,
        'description' => $project->description,
        'preview_url' => 'not-a-valid-url',
    ]);

    $response->assertInvalid(['preview_url']);

    $project->refresh();
    expect($project->preview_url)->toBe('https://valid.example.com');
});

test('project update can clear preview url', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'preview_url' => 'https://preview.example.com',
    ]);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)->put(route('projects.update', ['project' => $project], absolute: false), [
        'name' => $project->name,
        'default_locale' => $project->default_locale,
        'description' => $project->description,
        'preview_url' => '',
    ]);

    $response->assertRedirect(route('projects.settings.project', ['project' => $project], absolute: false));

    $project->refresh();
    expect($project->preview_url)->toBeNull();
});

test('dashboard includes project preview url', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'preview_url' => 'https://preview.example.com',
    ]);
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->get(route('dashboard', absolute: false))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('projects', 1)
            ->where('projects.0.preview_url', 'https://preview.example.com')
        );
});
