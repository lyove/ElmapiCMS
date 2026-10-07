<?php

use App\Models\Field;
use App\Models\Project;
use App\Services\RelationCollectionResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('options with resolved relation target maps stored slug to collection id for content UI', function (): void {
    $project = Project::create([
        'name' => 'Test Project',
        'description' => null,
        'default_locale' => 'en',
        'locales' => ['en'],
        'disk' => 'public',
    ]);
    $authors = $project->collections()->create([
        'name' => 'Authors',
        'slug' => 'authors',
        'order' => 1,
    ]);
    $articles = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 2,
    ]);

    $field = Field::create([
        'type' => 'relation',
        'label' => 'Author',
        'name' => 'author',
        'project_id' => $project->id,
        'collection_id' => $articles->id,
        'order' => 1,
        'options' => ['relation' => ['type' => 1, 'collection' => 'authors']],
        'validations' => [],
    ]);

    $options = RelationCollectionResolver::optionsWithResolvedRelationTarget($field, $project);

    expect($options['relation']['collection'])->toBe($authors->id);
    expect($options['relation'])->not->toHaveKey('collection_id');
});
