<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;
use Tests\Feature\Content\ContentCreationTestSupport;

uses(RefreshDatabase::class);

test('content export json applies state filter and includes field payload', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);

    $publishedEntry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'published']);
    $draftEntry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'draft']);

    ContentCreationTestSupport::createFieldValue($publishedEntry, $titleField, ['text_value' => 'Published Title']);
    ContentCreationTestSupport::createFieldValue($draftEntry, $titleField, ['text_value' => 'Draft Title']);

    $response = $this->actingAs($user)->post(route('projects.collections.content.export', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'format' => 'json',
        'state' => 'published',
    ]);

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/json');
    $data = json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR);

    expect($data)->toHaveCount(1);
    expect($data[0]['state'])->toBe('published');
    expect($data[0]['title'])->toBe('Published Title');
});

test('content export csv returns csv headers and rows', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'published']);
    ContentCreationTestSupport::createFieldValue($entry, $titleField, ['text_value' => 'CSV Title']);

    $response = $this->actingAs($user)->post(route('projects.collections.content.export', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'format' => 'csv',
        'state' => 'all',
    ]);

    $response->assertOk();
    $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    expect($response->getContent())->toContain('locale,state');
    expect($response->getContent())->toContain('CSV Title');
});

test('content import json creates entries and field values', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);

    $json = json_encode([
        [
            'locale' => 'en',
            'state' => 'published',
            'title' => 'Imported JSON Title',
        ],
    ], JSON_THROW_ON_ERROR);
    $file = UploadedFile::fake()->createWithContent('content.json', $json);

    $response = $this->actingAs($user)->post(route('projects.collections.content.import', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'file' => $file,
    ]);

    $response->assertOk()->assertJsonPath('imported', 1);
    expect($collection->contentEntries()->count())->toBe(1);
    expect($collection->contentEntries()->first()->fieldValues()->first()->text_value)->toBe('Imported JSON Title');
});

test('content import csv creates entries from csv rows', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);

    $csv = implode("\n", [
        'locale,state,title',
        'en,published,Imported CSV Title',
    ]);
    $file = UploadedFile::fake()->createWithContent('content.csv', $csv);

    $response = $this->actingAs($user)->post(route('projects.collections.content.import', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'file' => $file,
    ]);

    $response->assertOk()->assertJsonPath('imported', 1);
    expect($collection->contentEntries()->count())->toBe(1);
    expect($collection->contentEntries()->first()->fieldValues()->first()->text_value)->toBe('Imported CSV Title');
});

test('content export validates format', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $this->actingAs($user)->post(route('projects.collections.content.export', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'format' => 'xml',
    ])->assertInvalid(['format']);
});

test('content import requires create_content permission', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $file = UploadedFile::fake()->createWithContent('content.json', '[]');

    $this->actingAs($user)->post(route('projects.collections.content.import', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'file' => $file,
    ])->assertForbidden();
});

test('content import rejects invalid json file', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $file = UploadedFile::fake()->createWithContent('content.json', '{invalid-json');

    $this->actingAs($user)->post(route('projects.collections.content.import', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'file' => $file,
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'Invalid JSON file');
});

test('content import rejects csv without data rows', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $file = UploadedFile::fake()->createWithContent('content.csv', 'locale,state,title');

    $this->actingAs($user)->post(route('projects.collections.content.import', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'file' => $file,
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'No data found in file');
});

test('content export blocks foreign collection usage across projects', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $this->actingAs($user)
        ->post(route('projects.collections.content.export', [
            'project' => $projectA,
            'collection' => $foreignCollection,
        ], absolute: false), [
            'format' => 'json',
            'state' => 'all',
        ])
        ->assertNotFound();
});

test('content import blocks foreign collection usage across projects', function (): void {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->members()->attach($user->id);
    Permission::findOrCreate('create_content', 'web');
    $user->givePermissionTo('create_content');

    $foreignCollection = $projectB->collections()->create([
        'name' => 'Foreign',
        'slug' => 'foreign',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $file = UploadedFile::fake()->createWithContent('entries.json', json_encode([
        [
            'locale' => 'en',
            'state' => 'draft',
            'title' => 'Should not import',
        ],
    ], JSON_THROW_ON_ERROR));

    $this->actingAs($user)
        ->post(route('projects.collections.content.import', [
            'project' => $projectA,
            'collection' => $foreignCollection,
        ], absolute: false), [
            'file' => $file,
        ])
        ->assertNotFound();
});

test('content export excel returns spreadsheet content type', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $response = $this->actingAs($user)->post(route('projects.collections.content.export', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'format' => 'excel',
        'state' => 'all',
    ]);

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('content import accepts xlsx extension files', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);

    $csvPayload = "locale,state,title\nen,draft,Imported XLSX Title";
    $file = UploadedFile::fake()->createWithContent('content.xlsx', $csvPayload);

    $response = $this->actingAs($user)->post(route('projects.collections.content.import', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false), [
        'file' => $file,
    ]);

    $response->assertOk()->assertJsonPath('imported', 1);
});
