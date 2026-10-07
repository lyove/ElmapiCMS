<?php

use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\Project;
use App\Models\User;
use App\Services\ProjectTemplateBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function grantPermissionForSettings(User $user, string $permission): void
{
    Permission::findOrCreate($permission, 'web');
    $user->givePermissionTo($permission);
}

test('locale actions allow members to add set default and delete locales with guardrails', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->post(route('projects.settings.locales.add', ['project' => $project], absolute: false), ['locale' => 'de'])
        ->assertOk()
        ->assertJsonPath('default_locale', 'en');

    $this->actingAs($user)
        ->post(route('projects.settings.locales.add', ['project' => $project], absolute: false), ['locale' => 'de'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Locale already exists');

    $this->actingAs($user)
        ->put(route('projects.settings.locales.default', ['project' => $project], absolute: false), ['locale' => 'de'])
        ->assertOk()
        ->assertJsonPath('default_locale', 'de');

    $this->actingAs($user)
        ->delete(route('projects.settings.locales.delete', ['project' => $project, 'locale' => 'de'], absolute: false))
        ->assertStatus(422)
        ->assertJsonPath('message', 'Cannot delete default locale');

    $this->actingAs($user)
        ->delete(route('projects.settings.locales.delete', ['project' => $project, 'locale' => 'en'], absolute: false))
        ->assertOk();

    $project->refresh();
    expect($project->default_locale)->toBe('de');
    expect($project->locales)->toBe(['de']);
});

test('member actions can add and remove project members', function (): void {
    $owner = User::factory()->create();
    $newMember = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($owner->id);

    $this->actingAs($owner)
        ->post(route('projects.settings.members.add', ['project' => $project], absolute: false), [
            'user_id' => $newMember->id,
        ])
        ->assertOk();

    $this->assertDatabaseHas('project_user', [
        'project_id' => $project->id,
        'user_id' => $newMember->id,
    ]);

    $this->actingAs($owner)
        ->delete(route('projects.settings.members.remove', ['project' => $project, 'user' => $newMember->id], absolute: false))
        ->assertOk();

    $this->assertDatabaseMissing('project_user', [
        'project_id' => $project->id,
        'user_id' => $newMember->id,
    ]);
});

test('api token actions require api access permission', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->post(route('projects.settings.tokens.create', ['project' => $project], absolute: false), [
            'name' => 'No Permission Token',
            'abilities' => ['read'],
        ])
        ->assertForbidden();
});

test('authorized member can create update and delete api token', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);
    grantPermissionForSettings($user, 'access_api_access_settings');

    $createResponse = $this->actingAs($user)
        ->post(route('projects.settings.tokens.create', ['project' => $project], absolute: false), [
            'name' => 'Build Token',
            'abilities' => ['read', 'write'],
        ]);

    $createResponse->assertOk();
    $createResponse->assertJsonStructure(['token', 'token_id']);
    $tokenId = $createResponse->json('token_id');
    $plainTextToken = $createResponse->json('token');

    expect($plainTextToken)
        ->not->toContain('|');
    expect(PersonalAccessToken::findToken($plainTextToken)?->id)
        ->toBe($tokenId);

    $this->actingAs($user)
        ->put(route('projects.settings.tokens.update', ['project' => $project, 'token' => $tokenId], absolute: false), [
            'name' => 'Updated Token',
            'abilities' => ['read'],
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Token updated.');

    $token = PersonalAccessToken::query()->findOrFail($tokenId);
    expect($token->name)->toBe('Updated Token');
    expect($token->abilities)->toBe(['read']);

    $this->actingAs($user)
        ->delete(route('projects.settings.tokens.delete', ['project' => $project, 'token' => $tokenId], absolute: false))
        ->assertOk()
        ->assertJsonPath('message', 'Token deleted.');

    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
});

test('toggle public api requires permission and toggles value when authorized', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['public_api' => false]);
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->post(route('projects.settings.toggle-public', ['project' => $project], absolute: false))
        ->assertForbidden();

    grantPermissionForSettings($user, 'access_api_access_settings');

    $this->actingAs($user)
        ->post(route('projects.settings.toggle-public', ['project' => $project], absolute: false))
        ->assertOk()
        ->assertJsonPath('public_api', true);

    $this->actingAs($user)
        ->post(route('projects.settings.toggle-public', ['project' => $project], absolute: false))
        ->assertOk()
        ->assertJsonPath('public_api', false);
});

test('export endpoints require project settings permission', function (): void {
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
        ->post(route('projects.settings.export-import.export-project', ['project' => $project], absolute: false))
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('projects.settings.export-import.export-collection', ['project' => $project, 'collection' => $collection], absolute: false))
        ->assertForbidden();
});

test('authorized member can export project and collection json', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'name' => 'Export Source',
        'default_locale' => 'en',
        'locales' => ['en', 'de'],
    ]);
    $project->members()->attach($user->id);
    grantPermissionForSettings($user, 'access_project_settings');

    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $projectExportResponse = $this->actingAs($user)
        ->post(route('projects.settings.export-import.export-project', ['project' => $project], absolute: false), [
            'include_collections' => true,
            'include_content' => false,
        ]);

    $projectExportResponse->assertOk();
    $projectExportResponse->assertHeader('Content-Type', 'application/json');
    expect($projectExportResponse->headers->get('Content-Disposition'))->toContain('project_export-source_');
    $projectExportResponse->assertJsonPath('name', 'Export Source');
    $projectExportResponse->assertJsonPath('collections.0.slug', 'articles');

    $collectionExportResponse = $this->actingAs($user)
        ->post(route('projects.settings.export-import.export-collection', ['project' => $project, 'collection' => $collection], absolute: false), [
            'include_content' => false,
        ]);

    $collectionExportResponse->assertOk();
    $collectionExportResponse->assertHeader('Content-Type', 'application/json');
    expect($collectionExportResponse->headers->get('Content-Disposition'))->toContain('collection_articles_');
    $collectionExportResponse->assertJsonPath('slug', 'articles');
    $collectionExportResponse->assertJsonPath('fields.0.name', 'title');
});

test('project export preserves translation group links across entries', function (): void {
    $user = User::factory()->create();
    grantPermissionForSettings($user, 'access_project_settings');
    grantPermissionForSettings($user, 'create_project');

    $project = Project::factory()->create([
        'name' => 'Translations Source',
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Posts',
        'slug' => 'posts',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $titleField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $translationGroup = (string) Str::uuid();

    $enEntry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'published',
        'translation_group_id' => $translationGroup,
        'created_by' => $user->id,
        'updated_by' => $user->id,
        'published_at' => now(),
    ]);
    ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $enEntry->id,
        'field_id' => $titleField->id,
        'field_type' => 'text',
        'text_value' => 'Hello',
    ]);

    $frEntry = ContentEntry::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'fr',
        'state' => 'published',
        'translation_group_id' => $translationGroup,
        'created_by' => $user->id,
        'updated_by' => $user->id,
        'published_at' => now(),
    ]);
    ContentFieldValue::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'content_entry_id' => $frEntry->id,
        'field_id' => $titleField->id,
        'field_type' => 'text',
        'text_value' => 'Bonjour',
    ]);

    $exportResponse = $this->actingAs($user)
        ->post(route('projects.settings.export-import.export-project', ['project' => $project], absolute: false), [
            'include_collections' => true,
            'include_content' => true,
        ]);

    $exportResponse->assertOk();
    $exportData = json_decode($exportResponse->getContent(), true, 512, JSON_THROW_ON_ERROR);

    $entries = collect($exportData['demo_data'][0]['entries']);
    expect($entries)->toHaveCount(2);
    expect($entries->pluck('translation_group_id')->unique())->toHaveCount(1);
    expect($entries->pluck('translation_group_id')->first())->toBe($translationGroup);

    $template = ProjectTemplateBuilder::build($project, withDemoData: true);
    expect(collect($template['demo_data'][0]['entries'])->pluck('translation_group_id')->unique())->toHaveCount(1);

    $importResponse = $this->actingAs($user)
        ->post(route('projects.import', absolute: false), [
            'name' => 'Translations Target',
            'default_locale' => 'en',
            'description' => 'Imported project',
            'import_file' => UploadedFile::fake()->createWithContent(
                'project.json',
                json_encode($exportData, JSON_THROW_ON_ERROR)
            ),
        ]);

    $importResponse->assertRedirect();

    $imported = Project::query()->where('name', 'Translations Target')->firstOrFail();
    $importedCollection = $imported->collections()->where('slug', 'posts')->firstOrFail();
    $importedEntries = $importedCollection->contentEntries()->get();

    expect($importedEntries)->toHaveCount(2);
    expect($importedEntries->pluck('translation_group_id')->unique())->toHaveCount(1);
    expect($importedEntries->pluck('translation_group_id')->first())->toBe($translationGroup);
    $importedEntries->each(fn (ContentEntry $e) => expect($e->fresh()->published_version_id)->not->toBeNull());
});

test('collection export and import preserves translation group links', function (): void {
    $user = User::factory()->create();
    grantPermissionForSettings($user, 'access_project_settings');
    grantPermissionForSettings($user, 'create_collection');

    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);
    $project->members()->attach($user->id);

    $collection = $project->collections()->create([
        'name' => 'Posts',
        'slug' => 'posts',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $titleField = $collection->allFields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'options' => [],
        'validations' => [],
        'order' => 1,
    ]);

    $translationGroup = (string) Str::uuid();

    foreach (['en' => 'Hello', 'fr' => 'Bonjour'] as $locale => $title) {
        $entry = ContentEntry::create([
            'project_id' => $project->id,
            'collection_id' => $collection->id,
            'locale' => $locale,
            'state' => 'published',
            'translation_group_id' => $translationGroup,
            'created_by' => $user->id,
            'updated_by' => $user->id,
            'published_at' => now(),
        ]);
        ContentFieldValue::create([
            'project_id' => $project->id,
            'collection_id' => $collection->id,
            'content_entry_id' => $entry->id,
            'field_id' => $titleField->id,
            'field_type' => 'text',
            'text_value' => $title,
        ]);
    }

    $exportResponse = $this->actingAs($user)
        ->post(route('projects.settings.export-import.export-collection', [
            'project' => $project,
            'collection' => $collection,
        ], absolute: false), [
            'include_content' => true,
        ]);

    $exportResponse->assertOk();
    $exportData = json_decode($exportResponse->getContent(), true, 512, JSON_THROW_ON_ERROR);

    expect($exportData['demo_data'][0]['entries'])->toHaveCount(2);
    expect(collect($exportData['demo_data'][0]['entries'])->pluck('translation_group_id')->unique())->toHaveCount(1);

    $targetProject = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en', 'fr'],
    ]);
    $targetProject->members()->attach($user->id);

    $importResponse = $this->actingAs($user)
        ->post(route('projects.collections.import', ['project' => $targetProject], absolute: false), [
            'name' => 'Posts Imported',
            'slug' => 'posts-imported',
            'is_singleton' => false,
            'import_file' => UploadedFile::fake()->createWithContent(
                'collection.json',
                json_encode($exportData, JSON_THROW_ON_ERROR)
            ),
        ]);

    $importResponse->assertRedirect();

    $importedCollection = $targetProject->collections()->where('slug', 'posts-imported')->firstOrFail();
    $importedEntries = $importedCollection->contentEntries()->get();

    expect($importedEntries)->toHaveCount(2);
    expect($importedEntries->pluck('translation_group_id')->unique())->toHaveCount(1);
    expect($importedEntries->pluck('translation_group_id')->first())->toBe($translationGroup);
    $importedEntries->each(fn (ContentEntry $e) => expect($e->fresh()->published_version_id)->not->toBeNull());
});

test('set default locale appends locale when missing', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);
    $project->members()->attach($user->id);

    $response = $this->actingAs($user)
        ->put(route('projects.settings.locales.default', ['project' => $project], absolute: false), [
            'locale' => 'fr',
        ]);

    $response->assertOk()
        ->assertJsonPath('default_locale', 'fr');

    $project->refresh();
    expect($project->locales)->toContain('fr');
});

test('add member validates user existence', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $this->actingAs($user)
        ->post(route('projects.settings.members.add', ['project' => $project], absolute: false), [
            'user_id' => 999999,
        ])
        ->assertInvalid(['user_id']);
});

test('non members cannot perform project settings actions even with permissions', function (): void {
    $user = User::factory()->create();
    $memberToAdd = User::factory()->create();
    $project = Project::factory()->create([
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);

    grantPermissionForSettings($user, 'access_api_access_settings');
    grantPermissionForSettings($user, 'access_project_settings');

    $this->actingAs($user)
        ->post(route('projects.settings.locales.add', ['project' => $project], absolute: false), ['locale' => 'de'])
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('projects.settings.members.add', ['project' => $project], absolute: false), ['user_id' => $memberToAdd->id])
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('projects.settings.tokens.create', ['project' => $project], absolute: false), [
            'name' => 'Blocked Token',
            'abilities' => ['read'],
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('projects.settings.toggle-public', ['project' => $project], absolute: false))
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('projects.settings.export-import.export-project', ['project' => $project], absolute: false))
        ->assertForbidden();
});
