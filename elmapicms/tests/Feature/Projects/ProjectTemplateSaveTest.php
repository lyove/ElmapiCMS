<?php

use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\ContentRelationFieldRelation;
use App\Models\Project;
use App\Models\ProjectTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantTemplatePermission(User $user): void
{
    Permission::findOrCreate('access_project_settings', 'web');
    $user->givePermissionTo('access_project_settings');
}

test('guests are redirected when saving project as template', function (): void {
    $project = Project::factory()->create();

    $this->post(route('projects.saveAsTemplate', ['project' => $project], absolute: false), [
        'name' => 'Template Name',
        'slug' => 'template-slug',
    ])->assertRedirect(route('login', absolute: false));
});

test('authenticated users without permission cannot save project as template', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();

    $this->actingAs($user)
        ->post(route('projects.saveAsTemplate', ['project' => $project], absolute: false), [
            'name' => 'Template Name',
            'slug' => 'template-slug',
        ])
        ->assertForbidden();
});

test('non members cannot save project as template even with permission', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    grantTemplatePermission($user);

    $this->actingAs($user)
        ->post(route('projects.saveAsTemplate', ['project' => $project], absolute: false), [
            'name' => 'Template Name',
            'slug' => 'template-slug',
        ])
        ->assertForbidden();
});

test('authorized users can save project as template and relation options use collection slug', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'name' => 'Template Source',
    ]);
    $project->members()->attach($user->id);
    grantTemplatePermission($user);

    $authors = $project->collections()->create([
        'name' => 'Authors',
        'slug' => 'authors',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $articles = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $authors->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Author Name',
        'name' => 'author_name',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $articles->allFields()->create([
        'project_id' => $project->id,
        'type' => 'relation',
        'label' => 'Author',
        'name' => 'author',
        'options' => ['relation' => ['collection' => $authors->id, 'type' => 1]],
        'validations' => [],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->post(route('projects.saveAsTemplate', ['project' => $project], absolute: false), [
        'name' => 'My Exported Template',
        'slug' => 'My Exported Template',
        'description' => 'Template description',
    ]);

    $response->assertStatus(201);
    $response->assertJsonPath('message', 'Template created');

    $template = ProjectTemplate::query()->where('name', 'My Exported Template')->firstOrFail();

    expect($template->slug)->toBe('my-exported-template');
    expect($template->has_demo_data)->toBeFalse();
    expect($template->data['slug'])->toBe('my-exported-template');

    $articlesTemplate = collect($template->data['collections'])->firstWhere('slug', 'articles');
    $relationField = collect($articlesTemplate['fields'])->firstWhere('name', 'author');
    expect($relationField['options']['relation']['collection'])->toBe('authors');
});

test('saving project as template rejects duplicate slug', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantTemplatePermission($user);

    ProjectTemplate::create([
        'name' => 'Existing Template',
        'slug' => 'existing-template',
        'description' => 'Already exists',
        'has_demo_data' => false,
        'data' => ['slug' => 'existing-template', 'name' => 'Existing Template', 'collections' => []],
    ]);

    $response = $this->actingAs($user)->post(route('projects.saveAsTemplate', ['project' => $project], absolute: false), [
        'name' => 'Another Template',
        'slug' => 'existing-template',
    ]);

    $response->assertStatus(422);
    $response->assertJsonPath('message', 'Slug already exists');
});

test('saving project as template with demo data exports only published entries and relation temp ids', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantTemplatePermission($user);

    $authors = $project->collections()->create([
        'name' => 'Authors',
        'slug' => 'authors',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $articles = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $authorNameField = $authors->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Author Name',
        'name' => 'author_name',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $articleTitleField = $articles->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $articleAuthorField = $articles->allFields()->create([
        'project_id' => $project->id,
        'type' => 'relation',
        'label' => 'Author',
        'name' => 'author',
        'options' => ['relation' => ['collection' => $authors->id, 'type' => 1]],
        'validations' => [],
        'order' => 2,
    ]);

    $authorPublished = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $authors->id,
        'locale' => 'en',
        'state' => 'published',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    $articlePublished = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $articles->id,
        'locale' => 'en',
        'state' => 'published',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $articles->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $authors->id,
        'content_entry_id' => $authorPublished->id,
        'field_id' => $authorNameField->id,
        'field_type' => 'text',
        'text_value' => 'Jane Author',
    ]);
    ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $articles->id,
        'content_entry_id' => $articlePublished->id,
        'field_id' => $articleTitleField->id,
        'field_type' => 'text',
        'text_value' => 'Published Article',
    ]);
    $relationFieldValue = ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $articles->id,
        'content_entry_id' => $articlePublished->id,
        'field_id' => $articleAuthorField->id,
        'field_type' => 'relation',
        'json_value' => [$authorPublished->id],
    ]);
    ContentRelationFieldRelation::create([
        'field_value_id' => $relationFieldValue->id,
        'related_id' => $authorPublished->id,
        'related_type' => ContentEntry::class,
        'sort_order' => 0,
    ]);

    $response = $this->actingAs($user)->post(route('projects.saveAsTemplate', ['project' => $project], absolute: false), [
        'name' => 'Template With Demo',
        'slug' => 'template-with-demo',
        'include_demo_data' => true,
    ]);

    $response->assertStatus(201);

    $template = ProjectTemplate::query()->where('slug', 'template-with-demo')->firstOrFail();
    expect($template->has_demo_data)->toBeTrue();
    expect($template->data['has_demo_data'])->toBeTrue();
    expect($template->data)->toHaveKey('demo_data');

    $articlesDemo = collect($template->data['demo_data'])->firstWhere('collection', 'articles');
    expect($articlesDemo['entries'])->toHaveCount(1);

    $authorsDemo = collect($template->data['demo_data'])->firstWhere('collection', 'authors');
    $authorTempId = $authorsDemo['entries'][0]['id'];
    $articleRelationIds = $articlesDemo['entries'][0]['fields']['author'];

    expect($articleRelationIds)->toContain($authorTempId);
});
