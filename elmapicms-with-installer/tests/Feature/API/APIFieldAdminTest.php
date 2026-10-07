<?php

namespace Tests\Feature\API;

use App\Models\Collection;
use App\Models\Field;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class APIFieldAdminTest extends TestCase
{
    use RefreshDatabase;

    protected Project $project;

    protected Collection $collection;

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

        // Create a fresh empty collection for field tests
        $this->collection = $this->project->collections()->create([
            'name' => 'Test Collection',
            'slug' => 'test-collection',
        ]);
        $this->collection->order = $this->collection->id;
        $this->collection->save();

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

    public function test_create_field_with_valid_data(): void
    {
        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJsonStructure(['uuid', 'type', 'label', 'name', 'description', 'options', 'validations', 'order'])
            ->assertJson([
                'type' => 'text',
                'label' => 'Title',
                'name' => 'title',
            ]);

        $this->assertDatabaseHas('collection_fields', [
            'collection_id' => $this->collection->id,
            'name' => 'title',
            'type' => 'text',
        ]);
    }

    public function test_create_field_with_duplicate_name_returns_422(): void
    {
        // Create the first field
        $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
        ], $this->headers($this->adminToken));

        // Try to create another field with the same name
        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'longtext',
            'label' => 'Another Title',
            'name' => 'title',
        ], $this->headers($this->adminToken));

        $response->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_create_group_field(): void
    {
        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'group',
            'label' => 'SEO',
            'name' => 'seo',
            'options' => ['repeatable' => false],
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJson([
                'type' => 'group',
                'name' => 'seo',
            ]);
    }

    public function test_create_child_field_under_group(): void
    {
        // Create a group field first
        $groupResponse = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'group',
            'label' => 'SEO',
            'name' => 'seo',
            'options' => ['repeatable' => false],
        ], $this->headers($this->adminToken));

        $groupField = Field::where('collection_id', $this->collection->id)
            ->where('name', 'seo')
            ->first();

        // Create a child field under the group
        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'text',
            'label' => 'Meta Title',
            'name' => 'meta-title',
            'parent_field_id' => $groupField->id,
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJson([
                'type' => 'text',
                'name' => 'meta-title',
                'parent_field_id' => $groupField->id,
            ]);
    }

    public function test_create_field_on_nonexistent_collection_returns_404(): void
    {
        $response = $this->postJson('/api/collections/does-not-exist/fields', [
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
        ], $this->headers($this->adminToken));

        $response->assertNotFound();
    }

    public function test_create_relation_field_resolves_collection_slug_to_id(): void
    {
        $peer = $this->project->collections()->create([
            'name' => 'Relation Peer',
            'slug' => 'relation-peer-collection',
        ]);
        $peer->order = $peer->id;
        $peer->save();

        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'relation',
            'label' => 'Peer',
            'name' => 'peer',
            'options' => [
                'relation' => ['type' => 1, 'collection' => 'relation-peer-collection'],
            ],
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJsonPath('options.relation.collection', $peer->id);

        $this->assertArrayNotHasKey('collection_id', $response->json('options.relation'));
    }

    public function test_create_relation_field_accepts_legacy_collection_id_key(): void
    {
        $peer = $this->project->collections()->create([
            'name' => 'Relation Peer B',
            'slug' => 'relation-peer-collection-b',
        ]);
        $peer->order = $peer->id;
        $peer->save();

        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'relation',
            'label' => 'Peer',
            'name' => 'peer-b',
            'options' => [
                'relation' => ['type' => 1, 'collection_id' => $peer->id],
            ],
        ], $this->headers($this->adminToken));

        $response->assertStatus(201)
            ->assertJsonPath('options.relation.collection', $peer->id);

        $this->assertArrayNotHasKey('collection_id', $response->json('options.relation'));
    }

    public function test_create_relation_field_rejects_unknown_collection_reference(): void
    {
        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'relation',
            'label' => 'Author',
            'name' => 'author',
            'options' => [
                'relation' => ['type' => 1, 'collection' => 'missing-collection'],
            ],
        ], $this->headers($this->adminToken));

        $response->assertStatus(422)
            ->assertJsonValidationErrors('options.relation.collection');
    }

    /* ------------------------------------------------------------------
     * UPDATE
     * ------------------------------------------------------------------ */

    public function test_update_field_label_and_name(): void
    {
        // Create a field first
        $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'text',
            'label' => 'Old Label',
            'name' => 'old-label',
        ], $this->headers($this->adminToken));

        $field = Field::where('collection_id', $this->collection->id)
            ->where('name', 'old-label')
            ->first();

        $response = $this->putJson("/api/collections/{$this->collection->slug}/fields/{$field->uuid}", [
            'type' => 'text',
            'label' => 'New Label',
            'name' => 'new-label',
        ], $this->headers($this->adminToken));

        $response->assertOk()
            ->assertJson([
                'label' => 'New Label',
                'name' => 'new-label',
            ]);
    }

    public function test_update_nonexistent_field_returns_404(): void
    {
        $response = $this->putJson("/api/collections/{$this->collection->slug}/fields/non-existent-uuid", [
            'type' => 'text',
            'label' => 'Whatever',
            'name' => 'whatever',
        ], $this->headers($this->adminToken));

        $response->assertNotFound();
    }

    /* ------------------------------------------------------------------
     * DELETE
     * ------------------------------------------------------------------ */

    public function test_delete_field_soft_deletes(): void
    {
        $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'text',
            'label' => 'To Delete',
            'name' => 'to-delete',
        ], $this->headers($this->adminToken));

        $field = Field::where('collection_id', $this->collection->id)
            ->where('name', 'to-delete')
            ->first();

        $response = $this->deleteJson(
            "/api/collections/{$this->collection->slug}/fields/{$field->uuid}",
            [],
            $this->headers($this->adminToken)
        );

        $response->assertStatus(204);

        // Soft deleted — still in DB but with deleted_at
        $this->assertSoftDeleted('collection_fields', [
            'id' => $field->id,
        ]);
    }

    /* ------------------------------------------------------------------
     * REORDER
     * ------------------------------------------------------------------ */

    public function test_reorder_fields(): void
    {
        // Create two fields
        $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'text',
            'label' => 'First',
            'name' => 'first',
        ], $this->headers($this->adminToken));

        $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'text',
            'label' => 'Second',
            'name' => 'second',
        ], $this->headers($this->adminToken));

        $fields = Field::where('collection_id', $this->collection->id)->get();

        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields/reorder", [
            'fields' => $fields->map(fn ($f, $i) => [
                'uuid' => $f->uuid,
                'order' => $fields->count() - $i,
            ])->toArray(),
        ], $this->headers($this->adminToken));

        $response->assertOk()
            ->assertJson(['message' => 'Fields reordered successfully.']);
    }

    /* ------------------------------------------------------------------
     * AUTH / ABILITY CHECKS
     * ------------------------------------------------------------------ */

    public function test_create_field_returns_403_without_admin_ability(): void
    {
        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields", [
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
        ], $this->headers($this->readOnlyToken));

        $response->assertForbidden();
    }

    public function test_update_field_returns_403_without_admin_ability(): void
    {
        // Create field directly via Eloquent to avoid auth state leaking
        $field = Field::create([
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
            'project_id' => $this->project->id,
            'collection_id' => $this->collection->id,
            'order' => 1,
        ]);

        $response = $this->putJson("/api/collections/{$this->collection->slug}/fields/{$field->uuid}", [
            'type' => 'text',
            'label' => 'Updated',
            'name' => 'title',
        ], $this->headers($this->readOnlyToken));

        $response->assertForbidden();
    }

    public function test_delete_field_returns_403_without_admin_ability(): void
    {
        // Create field directly via Eloquent to avoid auth state leaking
        $field = Field::create([
            'type' => 'text',
            'label' => 'Title',
            'name' => 'title',
            'project_id' => $this->project->id,
            'collection_id' => $this->collection->id,
            'order' => 1,
        ]);

        $response = $this->deleteJson(
            "/api/collections/{$this->collection->slug}/fields/{$field->uuid}",
            [],
            $this->headers($this->readOnlyToken)
        );

        $response->assertForbidden();
    }

    public function test_reorder_fields_returns_403_without_admin_ability(): void
    {
        $response = $this->postJson("/api/collections/{$this->collection->slug}/fields/reorder", [
            'fields' => [],
        ], $this->headers($this->readOnlyToken));

        $response->assertForbidden();
    }
}
