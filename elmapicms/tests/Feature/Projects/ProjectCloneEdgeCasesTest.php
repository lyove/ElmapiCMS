<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantClonePermission(User $user): void
{
    Permission::findOrCreate('create_project', 'web');
    $user->givePermissionTo('create_project');
}

test('project clone preserves group child fields and parent linkage', function (): void {
    $user = User::factory()->create();
    grantClonePermission($user);

    $sourceProject = Project::factory()->create([
        'name' => 'Source Project',
    ]);
    $sourceProject->members()->attach($user->id);

    $collection = $sourceProject->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $group = $collection->allFields()->create([
        'project_id' => $sourceProject->id,
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'options' => ['repeatable' => false],
        'validations' => [],
        'order' => 1,
    ]);

    $collection->allFields()->create([
        'project_id' => $sourceProject->id,
        'type' => 'text',
        'label' => 'Meta Title',
        'name' => 'meta-title',
        'options' => ['repeatable' => false],
        'validations' => [],
        'parent_field_id' => $group->id,
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->post(route('projects.clone', ['project' => $sourceProject], absolute: false), [
        'name' => 'Cloned With Group',
        'description' => 'clone with nested group fields',
    ]);

    $response->assertStatus(201);

    $clonedProject = Project::query()->where('name', 'Cloned With Group')->firstOrFail();
    $clonedCollection = $clonedProject->collections()->where('slug', 'articles')->firstOrFail();

    $clonedGroup = $clonedCollection->allFields()
        ->whereNull('parent_field_id')
        ->where('type', 'group')
        ->where('name', 'seo')
        ->first();
    expect($clonedGroup)->not->toBeNull();

    $clonedChild = $clonedCollection->allFields()
        ->where('name', 'meta-title')
        ->whereNotNull('parent_field_id')
        ->first();

    expect($clonedChild)->not->toBeNull();
    expect($clonedChild->parent_field_id)->toBe($clonedGroup->id);
    expect($clonedChild->project_id)->toBe($clonedProject->id);
});
