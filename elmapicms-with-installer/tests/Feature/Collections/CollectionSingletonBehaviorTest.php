<?php

use App\Models\ContentEntry;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('singleton collection show redirects to create content when no entry exists', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Homepage',
        'slug' => 'homepage',
        'order' => 1,
        'is_singleton' => true,
    ]);

    $response = $this->actingAs($user)
        ->get(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));

    $response->assertRedirect(route('projects.collections.content.create', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false));
});

test('singleton collection show redirects to edit content when entry exists', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Homepage',
        'slug' => 'homepage',
        'order' => 1,
        'is_singleton' => true,
    ]);

    $entry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));

    $response->assertRedirect(route('projects.collections.content.edit', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false));
});

test('singleton collection show redirects to default locale entry when multiple exist', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Homepage',
        'slug' => 'homepage',
        'order' => 1,
        'is_singleton' => true,
    ]);

    $enEntry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $frEntry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'fr',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $frEntry->forceFill(['updated_at' => now()->addHour()])->save();

    $response = $this->actingAs($user)
        ->get(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));

    $response->assertRedirect(route('projects.collections.content.edit', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $enEntry,
    ], absolute: false));
});

test('singleton collection show falls back to latest entry when default locale has no entry', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Homepage',
        'slug' => 'homepage',
        'order' => 1,
        'is_singleton' => true,
    ]);

    $frEntry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'fr',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));

    $response->assertRedirect(route('projects.collections.content.edit', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $frEntry,
    ], absolute: false));
});

test('non singleton collection show loads normally', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->get(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertOk();
});
