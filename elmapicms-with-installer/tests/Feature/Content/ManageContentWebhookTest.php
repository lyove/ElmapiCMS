<?php

use App\Ai\Tools\ManageContent;
use App\Jobs\SendWebhookJob;
use App\Models\Collection;
use App\Models\Project;
use App\Models\User;
use App\Models\Webhook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Ai\Tools\Request;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

it('dispatches content.created webhooks when AI create_entry creates an entry', function () {
    Queue::fake();

    $user = User::factory()->create();
    Permission::findOrCreate('create_content', 'web');
    $user->givePermissionTo('create_content');
    $this->actingAs($user);

    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = Collection::query()->create([
        'project_id' => $project->id,
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $collection->fields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);

    Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Create Hook',
        'url' => 'https://example.com/hook',
        'events' => ['content.created'],
        'sources' => ['cms'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $tool = new ManageContent;
    $tool->handle(new Request([
        'action' => 'create_entry',
        'project_id' => $project->id,
        'collection' => 'articles',
        'fields' => [
            ['name' => 'title', 'value' => 'Hello from AI'],
        ],
    ]));

    Queue::assertPushed(SendWebhookJob::class, function (SendWebhookJob $job) {
        return $job->payload['event'] === 'content.created'
            && isset($job->payload['content_entry']);
    });
});

it('derives slug from the configured source field on create_entry when slug is omitted', function () {
    $user = User::factory()->create();
    Permission::findOrCreate('create_content', 'web');
    $user->givePermissionTo('create_content');
    $this->actingAs($user);

    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $collection = Collection::query()->create([
        'project_id' => $project->id,
        'name' => 'Posts',
        'slug' => 'posts',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $collection->fields()->create([
        'project_id' => $project->id,
        'type' => 'text',
        'label' => 'Title',
        'name' => 'title',
        'order' => 1,
        'options' => [],
        'validations' => [],
    ]);
    $collection->fields()->create([
        'project_id' => $project->id,
        'type' => 'slug',
        'label' => 'Slug',
        'name' => 'post_slug',
        'order' => 2,
        'options' => [
            'slug' => [
                'field' => 'title',
                'readonly' => true,
            ],
        ],
        'validations' => [],
    ]);

    $tool = new ManageContent;
    $result = $tool->handle(new Request([
        'action' => 'create_entry',
        'project_id' => $project->id,
        'collection' => 'posts',
        'fields' => [
            ['name' => 'title', 'value' => 'Hello From the Assistant'],
        ],
    ]));

    $payload = json_decode($result, true);
    expect($payload['error'] ?? null)->toBeNull();
    expect($payload['entry']['fields']['post_slug'])->toBe('hello-from-the-assistant');
});
