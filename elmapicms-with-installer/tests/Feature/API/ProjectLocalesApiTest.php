<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\API\APIProjectTest;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    APIProjectTest::seedTestProjectTemplate('blog-next-js');
    $this->project = APIProjectTest::createProjectFromTemplateStatic('blog-next-js', false);
    $this->project->update([
        'locales' => ['en'],
        'default_locale' => 'en',
    ]);

    $this->adminToken = $this->project->createToken('admin-token', ['read', 'create', 'update', 'delete', 'admin'])->plainTextToken;
    $this->readOnlyToken = $this->project->createToken('read-token', ['read'])->plainTextToken;
});

function projectLocaleHeaders(Project $project, string $token): array
{
    return [
        'project-id' => $project->uuid,
        'Authorization' => 'Bearer '.$token,
        'Accept' => 'application/json',
    ];
}

test('project locales api adds and lists locales via project resource', function () {
    $this->withHeaders(projectLocaleHeaders($this->project, $this->adminToken))
        ->postJson('/api/project/locales', ['locale' => 'tr'])
        ->assertOk()
        ->assertJsonPath('default_locale', 'en')
        ->assertJsonPath('locales', ['en', 'tr']);

    $this->withHeaders(projectLocaleHeaders($this->project, $this->adminToken))
        ->postJson('/api/project/locales', ['locale' => 'es'])
        ->assertOk()
        ->assertJsonPath('locales', ['en', 'tr', 'es']);
});

test('project locales api sets default locale and adds if missing', function () {
    $this->withHeaders(projectLocaleHeaders($this->project, $this->adminToken))
        ->putJson('/api/project/locales/default', ['locale' => 'tr'])
        ->assertOk()
        ->assertJsonPath('default_locale', 'tr')
        ->assertJsonPath('locales', ['en', 'tr']);
});

test('project locales api removes a non-default locale', function () {
    $this->project->update(['locales' => ['en', 'tr', 'es']]);

    $this->withHeaders(projectLocaleHeaders($this->project, $this->adminToken))
        ->deleteJson('/api/project/locales/tr')
        ->assertOk()
        ->assertJsonPath('locales', ['en', 'es']);
});

test('project locales api rejects duplicate locale', function () {
    $this->withHeaders(projectLocaleHeaders($this->project, $this->adminToken))
        ->postJson('/api/project/locales', ['locale' => 'en'])
        ->assertStatus(422);
});

test('project locales api rejects deleting default locale', function () {
    $this->withHeaders(projectLocaleHeaders($this->project, $this->adminToken))
        ->deleteJson('/api/project/locales/en')
        ->assertStatus(422);
});

test('project locales api requires admin ability', function () {
    $this->withHeaders(projectLocaleHeaders($this->project, $this->readOnlyToken))
        ->postJson('/api/project/locales', ['locale' => 'fr'])
        ->assertForbidden();
});
