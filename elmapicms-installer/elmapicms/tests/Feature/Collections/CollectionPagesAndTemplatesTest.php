<?php

use App\Models\CollectionTemplate;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function extractCollectionPayload(TestResponse $response): array
{
    $content = $response->getContent();
    preg_match('/data-page="([^"]+)"/', $content, $matches);

    expect(isset($matches[1]))->toBeTrue();

    $page = json_decode(
        html_entity_decode($matches[1], ENT_QUOTES),
        true,
        512,
        JSON_THROW_ON_ERROR
    );

    return $page['props']['collection'] ?? [];
}

test('collection templates index requires authentication and returns templates with fields', function (): void {
    $this->get(route('collection-templates.index', absolute: false))
        ->assertRedirect(route('login', absolute: false));

    $user = User::factory()->create();

    $zTemplate = CollectionTemplate::create([
        'name' => 'Z Template',
        'slug' => 'z-template',
        'description' => null,
        'is_singleton' => false,
    ]);
    $aTemplate = CollectionTemplate::create([
        'name' => 'A Template',
        'slug' => 'a-template',
        'description' => null,
        'is_singleton' => false,
    ]);

    $zTemplate->fields()->create([
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'description' => null,
        'placeholder' => null,
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $aTemplate->fields()->create([
        'type' => 'longtext',
        'label' => 'Body',
        'name' => 'body',
        'description' => null,
        'placeholder' => null,
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->get(route('collection-templates.index', absolute: false));

    $response->assertOk();
    $response->assertJsonCount(2);
    $response->assertJsonPath('0.name', 'A Template');
    $response->assertJsonPath('1.name', 'Z Template');
    $response->assertJsonPath('0.fields.0.name', 'body');
});

test('collection edit page requires member and access_collection_settings permission', function (): void {
    $project = Project::factory()->create();
    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->get(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertRedirect(route('login', absolute: false));

    $outsider = User::factory()->create();
    Permission::findOrCreate('access_collection_settings', 'web');
    $outsider->givePermissionTo('access_collection_settings');

    $this->actingAs($outsider)
        ->get(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertForbidden();

    $member = User::factory()->create();
    $project->members()->attach($member->id);
    Permission::findOrCreate('access_collection_settings', 'web');

    $this->actingAs($member)
        ->get(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertForbidden();

    $member->givePermissionTo('access_collection_settings');
    $this->actingAs($member)
        ->get(route('projects.collections.edit', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertOk();
});

test('collection show payload includes transformed parent and child fields', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $groupField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'group',
        'label' => 'SEO',
        'name' => 'seo',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);
    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'SEO Title',
        'name' => 'seo_title',
        'parent_field_id' => $groupField->id,
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $response = $this->actingAs($user)
        ->get(route('projects.collections.show', ['project' => $project, 'collection' => $collection], absolute: false));

    $response->assertOk();
    $payload = extractCollectionPayload($response);

    expect($payload)->toHaveKeys(['id', 'name', 'slug', 'fields']);
    expect($payload['fields'])->toHaveCount(2);

    $parent = collect($payload['fields'])->firstWhere('name', 'seo');
    $child = collect($payload['fields'])->firstWhere('name', 'seo_title');

    expect($parent['type'])->toBe('group');
    expect($child['parent_field_id'])->toBe($groupField->id);
});
