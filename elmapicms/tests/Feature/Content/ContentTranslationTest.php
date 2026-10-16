<?php

use App\Models\AppSetting;
use App\Models\ContentEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Content\ContentCreationTestSupport;

uses(RefreshDatabase::class);

test('create translation creates entry in target locale and links translation group', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'en',
        'state' => 'draft',
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.createTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'tr',
    ]);

    $response->assertOk()
        ->assertJsonPath('message', 'Translation entry created successfully')
        ->assertJsonStructure(['entry_id']);

    $translated = ContentEntry::query()->findOrFail($response->json('entry_id'));
    expect($translated->locale)->toBe('tr');
    expect($translated->translation_group_id)->toBe($entry->fresh()->translation_group_id);
});

test('create translation rejects locale not in project locales or already existing locale', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'en',
        'translation_group_id' => 'group-1',
    ]);
    ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'tr',
        'translation_group_id' => 'group-1',
    ]);

    $this->actingAs($user)->postJson(route('projects.collections.content.createTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'de',
    ])->assertStatus(422);

    $this->actingAs($user)->postJson(route('projects.collections.content.createTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'tr',
    ])->assertStatus(422);
});

test('link and unlink translation updates translation groups', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'update_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entryEn = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);
    $entryTr = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'tr']);

    $linkResponse = $this->actingAs($user)->postJson(route('projects.collections.content.linkTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryEn,
    ], absolute: false), [
        'translation_entry_id' => $entryTr->id,
    ])->assertOk()->assertJsonPath('message', 'Translation linked successfully');

    $entryEn->refresh();
    $entryTr->refresh();
    expect($entryEn->translation_group_id)->not->toBeNull();
    expect($entryTr->translation_group_id)->toBe($entryEn->translation_group_id);
    expect($linkResponse->json('translation_group_id'))->toBe($entryEn->translation_group_id);

    $this->actingAs($user)->postJson(route('projects.collections.content.unlinkTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryEn,
    ], absolute: false), [
        'translation_entry_id' => $entryTr->id,
    ])->assertOk()->assertJsonPath('message', 'Translation unlinked successfully');

    $entryTr->refresh();
    expect($entryTr->translation_group_id)->toBeNull();
});

test('link translation rejects same locale entries', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'update_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entryA = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);
    $entryB = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);

    $this->actingAs($user)->postJson(route('projects.collections.content.linkTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryA,
    ], absolute: false), [
        'translation_entry_id' => $entryB->id,
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'Translation entry must have a different locale.');
});

test('link translation rejects entry from another collection', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'update_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    [$otherProject, $otherCollection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entryInScope = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);
    $entryOutsideScope = ContentCreationTestSupport::createContentEntry($otherProject, $otherCollection, $user, ['locale' => 'tr']);

    $this->actingAs($user)->postJson(route('projects.collections.content.linkTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryInScope,
    ], absolute: false), [
        'translation_entry_id' => $entryOutsideScope->id,
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'Translation entry must belong to the same project and collection.');
});

test('unlink translation rejects entries that are not linked', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'update_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entryA = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);
    $entryB = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'tr']);

    $this->actingAs($user)->postJson(route('projects.collections.content.unlinkTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryA,
    ], absolute: false), [
        'translation_entry_id' => $entryB->id,
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'Entries are not linked as translations.');
});

test('translate with ai requires create_content permission', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);

    $this->actingAs($user)->postJson(route('projects.collections.content.translateWithAi', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'tr',
    ])->assertForbidden();
});

test('translate with ai rejects target locale outside project locales', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);

    $this->actingAs($user)->postJson(route('projects.collections.content.translateWithAi', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'de',
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'Locale "de" is not available in this project.');
});

test('translate with ai rejects existing translation locale in same group', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'en',
        'translation_group_id' => 'group-1',
    ]);
    ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'tr',
        'translation_group_id' => 'group-1',
    ]);

    $this->actingAs($user)->postJson(route('projects.collections.content.translateWithAi', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'tr',
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'A translation for locale "tr" already exists.');
});

test('translate with ai returns forbidden when ai is disabled', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);

    AppSetting::query()->create([
        'ai_enabled' => false,
        'ai_provider' => 'openai',
    ]);

    $this->actingAs($user)->postJson(route('projects.collections.content.translateWithAi', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'tr',
    ])->assertForbidden()
        ->assertJsonPath('message', 'AI assistant is disabled.');
});

test('translate with ai returns validation error when provider key is missing', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['locale' => 'en']);

    AppSetting::query()->create([
        'ai_enabled' => true,
        'ai_provider' => 'openai',
    ]);

    config()->set('ai.providers.openai.key', null);

    $this->actingAs($user)->postJson(route('projects.collections.content.translateWithAi', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'tr',
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'The AI provider "openai" is not configured.');
});

test('translate with ai blocks content entries outside target collection scope', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    [$otherProject, $otherCollection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $outsideEntry = ContentCreationTestSupport::createContentEntry($otherProject, $otherCollection, $user, ['locale' => 'en']);

    $this->actingAs($user)->postJson(route('projects.collections.content.translateWithAi', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $outsideEntry,
    ], absolute: false), [
        'target_locale' => 'tr',
    ])->assertNotFound();
});

test('link translation merges groups when both entries already have translation groups', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'update_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entryEn = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'en',
        'translation_group_id' => 'group-a',
    ]);
    $entryTr = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'tr',
        'translation_group_id' => 'group-b',
    ]);
    $entryDe = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'de',
        'translation_group_id' => 'group-b',
    ]);

    $this->actingAs($user)->postJson(route('projects.collections.content.linkTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entryEn,
    ], absolute: false), [
        'translation_entry_id' => $entryTr->id,
    ])->assertOk();

    expect($entryTr->fresh()->translation_group_id)->toBe('group-a');
    expect($entryDe->fresh()->translation_group_id)->toBe('group-a');
});

test('create translation publishes new entry for singleton collections', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'create_content');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    $collection->update(['is_singleton' => true]);

    $entry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'locale' => 'en',
        'state' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($user)->postJson(route('projects.collections.content.createTranslation', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $entry,
    ], absolute: false), [
        'target_locale' => 'tr',
    ]);

    $response->assertOk()->assertJsonStructure(['entry_id']);
    $translated = ContentEntry::query()->findOrFail($response->json('entry_id'));

    expect($translated->state)->toBe('published');
    expect($translated->published_at)->not->toBeNull();
});
