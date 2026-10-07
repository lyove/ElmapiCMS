<?php

use App\Models\Collection;
use App\Models\Field;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

function filterApiHeaders(Project $project, string $token): array
{
    return [
        'project-id' => $project->uuid,
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json',
    ];
}

function createFilterCollection(Project $project): Collection
{
    return Collection::create([
        'project_id' => $project->id,
        'name' => 'Products',
        'slug' => 'products',
        'order' => 1,
    ]);
}

function createFilterField(Project $project, Collection $collection, string $type, string $name, int $order, array $options = []): Field
{
    return Field::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'type' => $type,
        'label' => ucfirst(str_replace('_', ' ', $name)),
        'name' => $name,
        'order' => $order,
        'options' => $options,
    ]);
}

function titlesFromFilterResponse(TestResponse $response): array
{
    return collect($response->json())
        ->pluck('fields.title')
        ->filter()
        ->values()
        ->all();
}

beforeEach(function () {
    $this->project = Project::factory()->create([
        'public_api' => false,
        'default_locale' => 'en',
        'locales' => ['en'],
    ]);

    $this->token = $this->project
        ->createToken('filter-token', ['create', 'read', 'update', 'delete'])
        ->plainTextToken;

    $this->collection = createFilterCollection($this->project);
    createFilterField($this->project, $this->collection, 'text', 'title', 1);
    createFilterField($this->project, $this->collection, 'number', 'price', 2);
    createFilterField($this->project, $this->collection, 'boolean', 'in_stock', 3);
    createFilterField($this->project, $this->collection, 'enumeration', 'tags', 4, ['enumeration' => ['multiple' => true]]);

    // published entry 1
    $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->postJson('/api/products', [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'title' => 'Alpha Shirt',
                'price' => 25,
                'in_stock' => true,
                'tags' => ['sale', 'summer'],
            ],
        ])
        ->assertCreated();

    // published entry 2
    $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->postJson('/api/products', [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'title' => 'Beta Jacket',
                'price' => 80,
                'in_stock' => false,
                'tags' => ['winter'],
            ],
        ])
        ->assertCreated();

    // third published entry
    $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->postJson('/api/products', [
            'locale' => 'en',
            'state' => 'published',
            'data' => [
                'title' => 'Gamma Shoes',
                'price' => 120,
                'in_stock' => true,
                'tags' => ['sport'],
            ],
        ])
        ->assertCreated();
});

test('operator eq filters exact matches', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[title][eq]=Alpha Shirt')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toBe(['Alpha Shirt']);
});

test('operator not excludes exact matches', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[title][not]=Alpha Shirt')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toContain('Beta Jacket', 'Gamma Shoes')
        ->not->toContain('Alpha Shirt');
});

test('operator gt filters greater than values', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[price][gt]=79')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toContain('Beta Jacket', 'Gamma Shoes')
        ->not->toContain('Alpha Shirt');
});

test('operator gte filters greater than or equal values', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[price][gte]=80')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toContain('Beta Jacket', 'Gamma Shoes')
        ->not->toContain('Alpha Shirt');
});

test('operator lt filters less than values', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[price][lt]=80')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toBe(['Alpha Shirt']);
});

test('operator lte filters less than or equal values', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[price][lte]=80')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toContain('Alpha Shirt', 'Beta Jacket')
        ->not->toContain('Gamma Shoes');
});

test('operator like filters by partial text', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[title][like]=shirt')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toBe(['Alpha Shirt']);
});

test('operator in matches any listed values', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[title][in]=Alpha Shirt,Gamma Shoes')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toContain('Alpha Shirt', 'Gamma Shoes')
        ->not->toContain('Beta Jacket');
});

test('operator not_in excludes listed values', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[title][not_in]=Alpha Shirt,Gamma Shoes')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toBe(['Beta Jacket']);
});

test('operator between matches numeric ranges', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[price][between]=30,120')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toContain('Beta Jacket', 'Gamma Shoes')
        ->not->toContain('Alpha Shirt');
});

test('operator not_between excludes numeric ranges', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[price][not_between]=30,120')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toBe(['Alpha Shirt']);
});

test('operator null works on core nullable columns', function () {
    // published_at should be null for no published entries in this setup
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[published_at][null]=true')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toBe([]);
});

test('operator not_null works on core nullable columns', function () {
    $response = $this->withHeaders(filterApiHeaders($this->project, $this->token))
        ->getJson('/api/products?state=published&where[published_at][not_null]=true')
        ->assertOk();

    expect(titlesFromFilterResponse($response))->toContain('Alpha Shirt', 'Beta Jacket', 'Gamma Shoes');
});
