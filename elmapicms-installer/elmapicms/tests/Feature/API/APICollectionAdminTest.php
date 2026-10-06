<?php

namespace Tests\Feature\API;

use App\Models\Field;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class APICollectionAdminTest extends TestCase
{
    use RefreshDatabase;

    protected Project $project;

    protected string $adminToken;

    protected string $readOnlyToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        APIProjectTest::seedTestProjectTemplate('blog-next-js');

        $this->project = APIProjectTest::createProjectFromTemplateStatic('blog-next-js', false, [
            'public_api' => false,
        ]);

        $this->adminToken = $this->project->createToken('admin-token', ['read', 'create', 'update', 'delete', 'admin'])->plainTextToken;
        $this->readOnlyToken = $this->project->createToken('read-token', ['read'])->plainTextToken;
    }

    private function headers(string $token): array
    {
        return [
            'project-id' => $this->project->uuid,
            'Authorization' => 'Bearer '.$token,
        ];
    }

    /* ------------------------------------------------------------------
     * CREATE
     * ------------------------------------------------------------------ */

    public function test_create_collection_with_valid_data(): void
    {
        $response = $this->postJson('/api/collections', [
            'name' => 'Products',
            'slug' => 'products',
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJsonStructure(['uuid', 'name', 'slug', 'is_singleton', 'created_at', 'updated_at'])
            ->assertJson([
                'name' => 'Products',
                'slug' => 'products',
                'is_singleton' => false,
            ]);

        $this->assertDatabaseHas('collections', [
            'project_id' => $this->project->id,
            'slug' => 'products',
        ]);
    }

    public function test_create_collection_with_fields(): void
    {
        $response = $this->postJson('/api/collections', [
            'name' => 'Products',
            'slug' => 'products',
            'fields' => [
                [
                    'type' => 'text',
                    'label' => 'Title',
                    'name' => 'title',
                    'validations' => [
                        'required' => ['status' => true, 'message' => 'Title is required'],
                    ],
                ],
                [
                    'type' => 'number',
                    'label' => 'Price',
                    'name' => 'price',
                ],
                [
                    'type' => 'richtext',
                    'label' => 'Description',
                    'name' => 'description',
                ],
            ],
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJson([
                'name' => 'Products',
                'slug' => 'products',
            ])
            ->assertJsonCount(3, 'fields');

        $this->assertDatabaseHas('collection_fields', [
            'name' => 'title',
            'type' => 'text',
        ]);

        $this->assertDatabaseHas('collection_fields', [
            'name' => 'price',
            'type' => 'number',
        ]);

        $this->assertDatabaseHas('collection_fields', [
            'name' => 'description',
            'type' => 'richtext',
        ]);
    }

    public function test_create_collection_resolves_relation_field_collection_slug(): void
    {
        $peer = $this->project->collections()->create([
            'name' => 'Relation Peer',
            'slug' => 'relation-peer-for-articles',
        ]);
        $peer->order = $peer->id;
        $peer->save();

        $response = $this->postJson('/api/collections', [
            'name' => 'Articles With Relations',
            'slug' => 'articles-with-relations',
            'fields' => [
                [
                    'type' => 'text',
                    'label' => 'Title',
                    'name' => 'title',
                ],
                [
                    'type' => 'relation',
                    'label' => 'Linked entry',
                    'name' => 'linked-entry',
                    'options' => [
                        'relation' => ['type' => 1, 'collection' => 'relation-peer-for-articles'],
                    ],
                ],
            ],
        ], $this->headers($this->adminToken));

        $response->assertStatus(201);

        $relationField = Field::where('name', 'linked-entry')->where('type', 'relation')->first();
        $this->assertNotNull($relationField);
        $this->assertSame($peer->id, $relationField->options['relation']['collection']);
        $this->assertArrayNotHasKey('collection_id', $relationField->options['relation']);
    }

    public function test_create_collection_with_group_field_and_children(): void
    {
        $response = $this->postJson('/api/collections', [
            'name' => 'Landing Pages',
            'slug' => 'landing-pages',
            'fields' => [
                [
                    'type' => 'text',
                    'label' => 'Title',
                    'name' => 'title',
                ],
                [
                    'type' => 'group',
                    'label' => 'SEO',
                    'name' => 'seo',
                    'options' => ['repeatable' => false],
                    'children' => [
                        [
                            'type' => 'text',
                            'label' => 'Meta Title',
                            'name' => 'meta-title',
                        ],
                        [
                            'type' => 'longtext',
                            'label' => 'Meta Description',
                            'name' => 'meta-description',
                        ],
                    ],
                ],
            ],
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJsonCount(4, 'fields'); // title + seo + meta-title + meta-description (flat list)

        // Verify parent-child relationship
        $seoField = Field::where('name', 'seo')->first();
        $this->assertNotNull($seoField);
        $this->assertNull($seoField->parent_field_id);

        $metaTitle = Field::where('name', 'meta-title')->first();
        $this->assertNotNull($metaTitle);
        $this->assertEquals($seoField->id, $metaTitle->parent_field_id);
    }

    public function test_create_singleton_collection(): void
    {
        $response = $this->postJson('/api/collections', [
            'name' => 'Site Settings',
            'slug' => 'site-settings',
            'is_singleton' => true,
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJson([
                'name' => 'Site Settings',
                'slug' => 'site-settings',
                'is_singleton' => true,
            ]);
    }

    public function test_create_collection_with_duplicate_slug_returns_422(): void
    {
        $existingCollection = $this->project->collections()->first();

        $response = $this->postJson('/api/collections', [
            'name' => 'Duplicate',
            'slug' => $existingCollection->slug,
        ], $this->headers($this->adminToken));

        $response->assertStatus(422)
            ->assertJsonValidationErrors('slug');
    }

    public function test_create_collection_with_reserved_slug_collections_returns_422(): void
    {
        $response = $this->postJson('/api/collections', [
            'name' => 'Reserved',
            'slug' => 'collections',
        ], $this->headers($this->adminToken));

        $response->assertStatus(422)
            ->assertJsonValidationErrors('slug');
    }

    public function test_create_collection_with_reserved_slug_files_returns_422(): void
    {
        $response = $this->postJson('/api/collections', [
            'name' => 'Reserved',
            'slug' => 'files',
        ], $this->headers($this->adminToken));

        $response->assertStatus(422)
            ->assertJsonValidationErrors('slug');
    }

    /* ------------------------------------------------------------------
     * UPDATE
     * ------------------------------------------------------------------ */

    public function test_update_collection_name_and_slug(): void
    {
        // Create a collection first
        $this->postJson('/api/collections', [
            'name' => 'Old Name',
            'slug' => 'old-name',
        ], $this->headers($this->adminToken));

        $response = $this->putJson('/api/collections/old-name', [
            'name' => 'New Name',
            'slug' => 'new-name',
        ], $this->headers($this->adminToken));

        $response->assertOk()
            ->assertJson([
                'name' => 'New Name',
                'slug' => 'new-name',
            ]);

        $this->assertDatabaseHas('collections', [
            'project_id' => $this->project->id,
            'slug' => 'new-name',
        ]);
    }

    public function test_update_collection_slug_rewrites_relation_fields_referencing_old_slug_string(): void
    {
        $authors = $this->project->collections()->create([
            'name' => 'Authors',
            'slug' => 'authors-api-slug-remap',
        ]);
        $authors->order = $authors->id;
        $authors->save();

        $posts = $this->project->collections()->create([
            'name' => 'Posts',
            'slug' => 'posts-api-slug-remap',
        ]);
        $posts->order = $posts->id;
        $posts->save();

        $field = Field::create([
            'project_id' => $this->project->id,
            'collection_id' => $posts->id,
            'type' => 'relation',
            'label' => 'Author',
            'name' => 'author',
            'order' => 1,
            'options' => ['relation' => ['type' => 1, 'collection' => 'authors-api-slug-remap']],
            'validations' => [],
        ]);

        $response = $this->putJson('/api/collections/authors-api-slug-remap', [
            'name' => 'Authors',
            'slug' => 'authors-renamed-api',
        ], $this->headers($this->adminToken));

        $response->assertOk();

        $field->refresh();
        $this->assertSame($authors->id, $field->options['relation']['collection']);
        $this->assertArrayNotHasKey('collection_id', $field->options['relation']);
    }

    public function test_update_nonexistent_collection_returns_404(): void
    {
        $response = $this->putJson('/api/collections/does-not-exist', [
            'name' => 'Whatever',
            'slug' => 'whatever',
        ], $this->headers($this->adminToken));

        $response->assertNotFound();
    }

    /* ------------------------------------------------------------------
     * DELETE
     * ------------------------------------------------------------------ */

    public function test_delete_collection_cascades_entries_and_fields(): void
    {
        // Use a collection from the template that has fields
        $collection = $this->project->collections()->first();
        $slug = $collection->slug;

        // Add a content entry so we can verify cascade
        $collection->contentEntries()->create([
            'project_id' => $this->project->id,
            'locale' => 'en',
            'state' => 'published',
        ]);

        $this->assertTrue($collection->allFields()->count() > 0);
        $this->assertTrue($collection->contentEntries()->count() > 0);

        $response = $this->deleteJson("/api/collections/{$slug}", [
            'slug' => $slug,
        ], $this->headers($this->adminToken));

        $response->assertStatus(204);

        $this->assertDatabaseMissing('collections', [
            'id' => $collection->id,
        ]);
    }

    public function test_delete_collection_requires_slug_confirmation(): void
    {
        $collection = $this->project->collections()->first();

        $response = $this->deleteJson("/api/collections/{$collection->slug}", [
            'slug' => 'wrong-slug',
        ], $this->headers($this->adminToken));

        $response->assertStatus(422)
            ->assertJsonValidationErrors('slug');
    }

    /* ------------------------------------------------------------------
     * REORDER
     * ------------------------------------------------------------------ */

    public function test_reorder_collections(): void
    {
        $collections = $this->project->collections()->orderBy('order')->get();

        $reorderPayload = $collections->map(function ($c, $index) use ($collections) {
            return [
                'uuid' => $c->uuid,
                'order' => $collections->count() - $index,
            ];
        })->toArray();

        $response = $this->postJson('/api/collections/reorder', [
            'collections' => $reorderPayload,
        ], $this->headers($this->adminToken));

        $response->assertOk()
            ->assertJson(['message' => 'Collections reordered successfully.']);
    }

    /* ------------------------------------------------------------------
     * AUTH / ABILITY CHECKS
     * ------------------------------------------------------------------ */

    public function test_create_returns_403_without_admin_ability(): void
    {
        $response = $this->postJson('/api/collections', [
            'name' => 'Products',
            'slug' => 'products',
        ], $this->headers($this->readOnlyToken));

        $response->assertForbidden();
    }

    public function test_update_returns_403_without_admin_ability(): void
    {
        $collection = $this->project->collections()->first();

        $response = $this->putJson("/api/collections/{$collection->slug}", [
            'name' => 'Updated',
            'slug' => $collection->slug,
        ], $this->headers($this->readOnlyToken));

        $response->assertForbidden();
    }

    public function test_delete_returns_403_without_admin_ability(): void
    {
        $collection = $this->project->collections()->first();

        $response = $this->deleteJson("/api/collections/{$collection->slug}", [
            'slug' => $collection->slug,
        ], $this->headers($this->readOnlyToken));

        $response->assertForbidden();
    }

    public function test_reorder_returns_403_without_admin_ability(): void
    {
        $response = $this->postJson('/api/collections/reorder', [
            'collections' => [],
        ], $this->headers($this->readOnlyToken));

        $response->assertForbidden();
    }

    public function test_create_returns_401_without_authentication_even_with_public_api(): void
    {
        $this->project->update(['public_api' => true]);

        $response = $this->postJson('/api/collections', [
            'name' => 'Products',
            'slug' => 'products',
        ], ['project-id' => $this->project->uuid]);

        // Without a bearer token, ensureAbility will return 403
        // since auth('sanctum')->user() is null
        $response->assertForbidden();
    }
}
