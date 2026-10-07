<?php

use App\Models\Asset;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantProjectRoutePermission(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('guests are redirected when updating or deleting a project', function (): void {
    $project = Project::factory()->create();

    $this->put(route('projects.update', ['project' => $project], absolute: false), [
        'name' => 'Updated Name',
        'default_locale' => 'en',
    ])->assertRedirect(route('login', absolute: false));

    $this->delete(route('projects.destroy', ['project' => $project], absolute: false))
        ->assertRedirect(route('login', absolute: false));
});

test('non members cannot update or delete project routes', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();

    grantProjectRoutePermission($user, 'delete_project');

    $this->actingAs($user)
        ->put(route('projects.update', ['project' => $project], absolute: false), [
            'name' => 'Updated Name',
            'default_locale' => 'en',
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->delete(route('projects.destroy', ['project' => $project], absolute: false))
        ->assertForbidden();
});

test('members can update project details and disk when disk value is valid', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'name' => 'Old Name',
        'default_locale' => 'en',
        'description' => 'Old Description',
        'disk' => 'public',
    ]);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)->put(route('projects.update', ['project' => $project], absolute: false), [
        'name' => 'Updated Name',
        'default_locale' => 'tr',
        'description' => 'Updated Description',
        'disk' => 's3',
    ]);

    $response->assertRedirect(route('projects.settings.project', ['project' => $project], absolute: false));

    $project->refresh();
    expect($project->name)->toBe('Updated Name');
    expect($project->default_locale)->toBe('tr');
    expect($project->description)->toBe('Updated Description');
    expect($project->disk)->toBe('s3');
});

test('project update ignores invalid disk values and validates required fields', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'disk' => 'public',
    ]);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)->put(route('projects.update', ['project' => $project], absolute: false), [
        'name' => 'Invalid # Name',
        'default_locale' => '',
        'description' => 'Still invalid',
        'disk' => 'invalid-disk',
    ]);

    $response->assertInvalid(['name', 'default_locale']);

    $project->refresh();
    expect($project->disk)->toBe('public');
});

test('members without delete_project permission cannot delete project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->delete(route('projects.destroy', ['project' => $project], absolute: false))
        ->assertForbidden();

    $this->assertDatabaseHas('projects', ['id' => $project->id]);
});

test('authorized members can delete project and related data', function (): void {
    Storage::fake('public');

    $user = User::factory()->create();
    $project = Project::factory()->create([
        'disk' => 'public',
    ]);
    $project->members()->attach($user->id);
    grantProjectRoutePermission($user, 'delete_project');

    Storage::disk('public')->put("projects/{$project->uuid}/sample.txt", 'sample');

    $asset = Asset::create([
        'project_id' => $project->id,
        'filename' => 'sample.txt',
        'original_filename' => 'sample.txt',
        'mime_type' => 'text/plain',
        'extension' => 'txt',
        'size' => 6,
        'disk' => 'public',
        'path' => "projects/{$project->uuid}/sample.txt",
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    $asset->metadata()->create([
        'title' => 'Sample Asset',
    ]);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $field = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $entry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $entry->id,
        'field_id' => $field->id,
        'field_type' => 'text',
        'text_value' => 'Sample title',
    ]);

    $response = $this->actingAs($user)
        ->delete(route('projects.destroy', ['project' => $project], absolute: false));

    $response->assertRedirect(route('dashboard', absolute: false));
    $response->assertSessionHas('success', 'Project deleted successfully.');

    $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    $this->assertDatabaseMissing('collections', ['id' => $collection->id]);
    $this->assertDatabaseMissing('collection_fields', ['id' => $field->id]);
    $this->assertDatabaseMissing('content_entries', ['id' => $entry->id]);
    $this->assertDatabaseMissing('content_field_values', ['content_entry_id' => $entry->id]);
    $this->assertDatabaseMissing('assets', ['id' => $asset->id]);
    $this->assertDatabaseMissing('asset_metadata', ['asset_id' => $asset->id]);
    Storage::disk('public')->assertMissing("projects/{$project->uuid}/sample.txt");
});

test('users with global access and delete_project can delete project without direct membership', function (): void {
    Storage::fake('public');

    $user = User::factory()->create();
    $project = Project::factory()->create([
        'disk' => 'public',
    ]);

    grantProjectRoutePermission($user, 'access_all_projects');
    grantProjectRoutePermission($user, 'delete_project');

    $response = $this->actingAs($user)
        ->delete(route('projects.destroy', ['project' => $project], absolute: false));

    $response->assertRedirect(route('dashboard', absolute: false));
    $this->assertDatabaseMissing('projects', ['id' => $project->id]);
});
