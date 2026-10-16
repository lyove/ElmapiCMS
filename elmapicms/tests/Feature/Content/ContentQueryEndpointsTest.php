<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Content\ContentCreationTestSupport;

uses(RefreshDatabase::class);

test('content search finds entries by dynamic text field values', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);

    $entryA = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'published']);
    $entryB = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'draft']);

    ContentCreationTestSupport::createFieldValue($entryA, $titleField, ['text_value' => 'Laravel Guide']);
    ContentCreationTestSupport::createFieldValue($entryB, $titleField, ['text_value' => 'Vue Handbook']);

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.search', [
        'project' => $project,
        'collection' => $collection,
        'search' => 'Laravel',
    ], absolute: false));

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$entryA->id]);
});

test('content search filters by locale and state', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $publishedEn = ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'state' => 'published',
        'locale' => 'en',
    ]);
    ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'state' => 'published',
        'locale' => 'tr',
    ]);
    ContentCreationTestSupport::createContentEntry($project, $collection, $user, [
        'state' => 'draft',
        'locale' => 'en',
    ]);

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.search', [
        'project' => $project,
        'collection' => $collection,
        'filter_state' => 'published',
        'filter_locale' => 'en',
    ], absolute: false));

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$publishedEn->id]);
});

test('content search sorts by dynamic field value', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);

    $entryA = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $entryB = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $entryC = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    ContentCreationTestSupport::createFieldValue($entryA, $titleField, ['text_value' => 'Gamma']);
    ContentCreationTestSupport::createFieldValue($entryB, $titleField, ['text_value' => 'Alpha']);
    ContentCreationTestSupport::createFieldValue($entryC, $titleField, ['text_value' => 'Beta']);

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.search', [
        'project' => $project,
        'collection' => $collection,
        'sort' => 'title',
        'direction' => 'asc',
    ], absolute: false));

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$entryB->id, $entryC->id, $entryA->id]);
});

test('content search returns trashed entries when filter state is trashed', function (): void {
    $user = User::factory()->create();
    ContentCreationTestSupport::grantPermission($user, 'move_content_to_trash');
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $trashedEntry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $activeEntry = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $this->actingAs($user)->deleteJson(route('projects.collections.content.destroy', [
        'project' => $project,
        'collection' => $collection,
        'contentEntry' => $trashedEntry,
    ], absolute: false))->assertOk();

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.search', [
        'project' => $project,
        'collection' => $collection,
        'filter_state' => 'trashed',
    ], absolute: false));

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->all())->toContain($trashedEntry->id);
    expect(collect($response->json('data'))->pluck('id')->all())->not->toContain($activeEntry->id);
});

test('content find returns entries in requested id order with dynamic field values', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $titleField = ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);

    $entryA = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $entryB = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $entryC = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    ContentCreationTestSupport::createFieldValue($entryA, $titleField, ['text_value' => 'A']);
    ContentCreationTestSupport::createFieldValue($entryB, $titleField, ['text_value' => 'B']);
    ContentCreationTestSupport::createFieldValue($entryC, $titleField, ['text_value' => 'C']);

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.find', [
        'project' => $project,
        'collection' => $collection,
        'ids' => [$entryC->id, $entryA->id, $entryB->id],
    ], absolute: false));

    $response->assertOk();
    expect(collect($response->json())->pluck('id')->all())->toBe([$entryC->id, $entryA->id, $entryB->id]);
    expect(collect($response->json())->pluck('title')->all())->toBe(['C', 'A', 'B']);
});

test('content find ignores ids from other collections', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);
    [$otherProject, $otherCollection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entryInScope = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $entryOutsideScope = ContentCreationTestSupport::createContentEntry($otherProject, $otherCollection, $user);

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.find', [
        'project' => $project,
        'collection' => $collection,
        'ids' => [$entryOutsideScope->id, $entryInScope->id],
    ], absolute: false));

    $response->assertOk();
    expect(collect($response->json())->pluck('id')->all())->toBe([$entryInScope->id]);
});

test('content find returns empty array for empty ids input', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.find', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false));

    $response->assertOk();
    expect($response->json())->toBeArray()->toBeEmpty();
});

test('relation collection endpoint returns collection with fields', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
    ]);
    ContentCreationTestSupport::createField($project, $collection, [
        'type' => 'number',
        'label' => 'Score',
        'name' => 'score',
        'order' => 2,
    ]);

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.getRelationCollection', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false));

    $response->assertOk()
        ->assertJsonPath('id', $collection->id)
        ->assertJsonCount(2, 'fields');
});

test('relation collection endpoint requires authentication', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $this->getJson(route('projects.collections.content.getRelationCollection', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false))->assertUnauthorized();
});

test('relation collection endpoint blocks non project members', function (): void {
    $member = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($member);
    $outsider = User::factory()->create();

    $this->actingAs($outsider)->getJson(route('projects.collections.content.getRelationCollection', [
        'project' => $project,
        'collection' => $collection,
    ], absolute: false))->assertForbidden();
});

test('content search supports date range filters and standard column sorting', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $oldEntry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'draft']);
    $recentEntry = ContentCreationTestSupport::createContentEntry($project, $collection, $user, ['state' => 'draft']);

    $oldEntry->forceFill([
        'created_at' => now()->subDays(5),
        'updated_at' => now()->subDays(4),
    ])->save();
    $recentEntry->forceFill([
        'created_at' => now()->subDay(),
        'updated_at' => now()->subHours(12),
    ])->save();

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.search', [
        'project' => $project,
        'collection' => $collection,
        'created_at_from' => now()->subDays(2)->toDateString(),
        'sort' => 'created_at',
        'direction' => 'asc',
    ], absolute: false));

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$recentEntry->id]);
    expect(collect($response->json('data'))->pluck('id')->all())->not->toContain($oldEntry->id);
});

test('content find accepts comma separated ids parameter', function (): void {
    $user = User::factory()->create();
    [$project, $collection] = ContentCreationTestSupport::createProjectAndCollection($user);

    $entryA = ContentCreationTestSupport::createContentEntry($project, $collection, $user);
    $entryB = ContentCreationTestSupport::createContentEntry($project, $collection, $user);

    $response = $this->actingAs($user)->getJson(route('projects.collections.content.find', [
        'project' => $project,
        'collection' => $collection,
        'ids' => "{$entryB->id},{$entryA->id}",
    ], absolute: false));

    $response->assertOk();
    expect(collect($response->json())->pluck('id')->all())->toBe([$entryB->id, $entryA->id]);
});
