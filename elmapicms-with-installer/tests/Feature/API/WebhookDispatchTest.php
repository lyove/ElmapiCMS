<?php

use App\Events\ContentEvent;
use App\Events\ProjectAuthEvent;
use App\Jobs\SendWebhookJob;
use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\Project;
use App\Models\ProjectAuthEmailVerificationToken;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use App\Models\User;
use App\Models\Webhook;
use App\Models\WebhookLog;
use App\Services\Auth\ProjectAuthEmailVerificationService;
use App\Services\Auth\ProjectAuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

it('dispatches content.trashed with content_entry and respects pivot collection filter', function () {
    Queue::fake();

    $user = User::factory()->create();
    $project = Project::factory()->create();
    $collectionA = Collection::query()->create([
        'project_id' => $project->id,
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $collectionB = Collection::query()->create([
        'project_id' => $project->id,
        'name' => 'Pages',
        'slug' => 'pages',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $webhook = Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Trashed Hook',
        'url' => 'https://example.com/hook',
        'events' => ['content.trashed'],
        'sources' => ['cms'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);
    $webhook->collections()->sync([$collectionA->id]);

    $entryA = ContentEntry::query()->create([
        'project_id' => $project->id,
        'collection_id' => $collectionA->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    $entryB = ContentEntry::query()->create([
        'project_id' => $project->id,
        'collection_id' => $collectionB->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    event(new ContentEvent('content.trashed', $project, $entryA, 'cms'));

    Queue::assertPushed(SendWebhookJob::class, function (SendWebhookJob $job) use ($webhook) {
        return $job->webhook->id === $webhook->id
            && isset($job->payload['content_entry'])
            && $job->payload['event'] === 'content.trashed';
    });

    Queue::fake();
    event(new ContentEvent('content.trashed', $project, $entryB, 'cms'));
    Queue::assertNotPushed(SendWebhookJob::class);
});

it('dispatches to all collections when webhook has no collection bindings', function () {
    Queue::fake();

    $user = User::factory()->create();
    $project = Project::factory()->create();
    $collectionA = Collection::query()->create([
        'project_id' => $project->id,
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);
    $collectionB = Collection::query()->create([
        'project_id' => $project->id,
        'name' => 'Pages',
        'slug' => 'pages',
        'order' => 2,
        'is_singleton' => false,
    ]);

    $webhook = Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'All Collections Hook',
        'url' => 'https://example.com/hook',
        'events' => ['content.created'],
        'sources' => ['cms'],
        'payload' => false,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $entryA = ContentEntry::query()->create([
        'project_id' => $project->id,
        'collection_id' => $collectionA->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    $entryB = ContentEntry::query()->create([
        'project_id' => $project->id,
        'collection_id' => $collectionB->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    event(new ContentEvent('content.created', $project, $entryA, 'cms'));
    event(new ContentEvent('content.created', $project, $entryB, 'cms'));

    Queue::assertPushed(SendWebhookJob::class, 2);
    Queue::assertPushed(SendWebhookJob::class, function (SendWebhookJob $job) use ($webhook, $collectionA) {
        return $job->webhook->id === $webhook->id
            && $job->payload['collection_id'] === $collectionA->id;
    });
    Queue::assertPushed(SendWebhookJob::class, function (SendWebhookJob $job) use ($webhook, $collectionB) {
        return $job->webhook->id === $webhook->id
            && $job->payload['collection_id'] === $collectionB->id;
    });
});

it('adds timestamp and delivery_id to payload and signs final payload', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $webhook = Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Signature Hook',
        'url' => 'https://example.com/hook',
        'secret' => 'secret123',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $capturedBody = null;
    $capturedSignature = null;

    Http::fake(function (ClientRequest $request) use (&$capturedBody, &$capturedSignature) {
        $capturedBody = $request->data();
        $capturedSignature = $request->header('X-Webhook-Signature')[0] ?? null;

        return Http::response(['ok' => true], 200);
    });

    $job = new SendWebhookJob($webhook, [
        'event' => 'content.created',
        'project_uuid' => $project->uuid,
    ]);
    $job->handle();

    expect($capturedBody)->toBeArray()
        ->and($capturedBody)->toHaveKey('timestamp')
        ->and($capturedBody)->toHaveKey('delivery_id');

    $expectedSignature = hash_hmac('sha256', json_encode($capturedBody), 'secret123');
    expect($capturedSignature)->toBe($expectedSignature);

    $log = WebhookLog::query()->latest('id')->firstOrFail();
    expect($log->request)->toHaveKeys(['timestamp', 'delivery_id'])
        ->and($log->response)->toMatchArray([
            'status' => '200',
            'body' => '{"ok":true}',
            'body_truncated' => false,
        ]);
});

it('truncates large webhook response bodies in logs', function () {
    config(['webhooks.log_response_body_max_bytes' => 30]);

    $user = User::factory()->create();
    $project = Project::factory()->create();
    $webhook = Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Long Body',
        'url' => 'https://example.com/hook',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $longBody = str_repeat('a', 500);

    Http::fake(fn () => Http::response($longBody, 200));

    (new SendWebhookJob($webhook, [
        'event' => 'content.created',
        'project_uuid' => $project->uuid,
    ]))->handle();

    $log = WebhookLog::query()->latest('id')->firstOrFail();
    expect($log->response['body_truncated'])->toBeTrue()
        ->and(strlen($log->response['body']))->toBeLessThanOrEqual(35);
});

it('does not retry 4xx but retries 5xx and network failures', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $webhook = Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Retry Hook',
        'url' => 'https://example.com/hook',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    Http::fakeSequence()
        ->push('bad request', 400)
        ->push('server error', 500);

    $didThrow = false;
    try {
        (new SendWebhookJob($webhook, [
            'event' => 'content.created',
            'project_uuid' => $project->uuid,
        ]))->handle();
    } catch (RuntimeException) {
        $didThrow = true;
    }
    expect($didThrow)->toBeFalse();

    $didThrow = false;
    try {
        (new SendWebhookJob($webhook, [
            'event' => 'content.created',
            'project_uuid' => $project->uuid,
        ]))->handle();
    } catch (RuntimeException) {
        $didThrow = true;
    }
    expect($didThrow)->toBeTrue();

    $serverErrorLog = WebhookLog::query()->latest('id')->firstOrFail();
    expect($serverErrorLog->status)->toBe('500');

    Http::fake(function () {
        throw new RuntimeException('connection failed');
    });
    $didThrow = false;
    try {
        (new SendWebhookJob($webhook, [
            'event' => 'content.created',
            'project_uuid' => $project->uuid,
        ]))->handle();
    } catch (RuntimeException) {
        $didThrow = true;
    }
    expect($didThrow)->toBeTrue();
});

it('dispatches project auth events for logout logout_all and email verification', function () {
    Event::fake([ProjectAuthEvent::class]);

    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user->id);

    $authUser = ProjectAuthUser::factory()->create([
        'project_id' => $project->id,
        'email' => 'member@example.com',
    ]);
    $session = ProjectAuthSession::factory()->create([
        'project_id' => $project->id,
        'project_auth_user_id' => $authUser->id,
    ]);

    /** @var ProjectAuthService $service */
    $service = app(ProjectAuthService::class);
    $request = Request::create('/api/auth/logout', 'POST');

    $service->logoutCurrentSession($project, $session, $request, $authUser);
    $service->logoutAllSessions($project, $authUser, $request);

    Event::assertDispatched(ProjectAuthEvent::class, fn (ProjectAuthEvent $event) => $event->name === 'auth.logout.success');
    Event::assertDispatched(ProjectAuthEvent::class, fn (ProjectAuthEvent $event) => $event->name === 'auth.logout_all.success');

    $rawToken = 'verification-token';
    ProjectAuthEmailVerificationToken::query()->create([
        'project_id' => $project->id,
        'project_auth_user_id' => $authUser->id,
        'token_hash' => hash('sha256', $rawToken),
        'email' => $authUser->email,
        'expires_at' => now()->addHour(),
    ]);

    /** @var ProjectAuthEmailVerificationService $emailVerificationService */
    $emailVerificationService = app(ProjectAuthEmailVerificationService::class);
    $emailVerificationService->confirmByToken($project, $rawToken, $request);

    Event::assertDispatched(ProjectAuthEvent::class, fn (ProjectAuthEvent $event) => $event->name === 'auth.email_verification.verified');
});

it('omits content_entry when webhook payload is disabled', function () {
    Queue::fake();

    $user = User::factory()->create();
    $project = Project::factory()->create();
    $collection = Collection::query()->create([
        'project_id' => $project->id,
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
        'is_singleton' => false,
    ]);

    $webhook = Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Minimal Payload',
        'url' => 'https://example.com/hook',
        'events' => ['content.created'],
        'sources' => ['cms'],
        'payload' => false,
        'status' => true,
        'created_by' => $user->id,
    ]);

    $entry = ContentEntry::query()->create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'locale' => 'en',
        'state' => 'draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    event(new ContentEvent('content.created', $project, $entry, 'cms'));

    Queue::assertPushed(SendWebhookJob::class, function (SendWebhookJob $job) use ($webhook) {
        return $job->webhook->id === $webhook->id
            && ! isset($job->payload['content_entry'])
            && $job->payload['event'] === 'content.created';
    });
});

it('blocks delivery to unsafe webhook URLs at send time', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $webhook = Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Unsafe',
        'url' => 'http://127.0.0.1/hook',
        'events' => ['content.created'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    Http::fake();

    (new SendWebhookJob($webhook, [
        'event' => 'content.created',
        'project_uuid' => $project->uuid,
    ]))->handle();

    Http::assertNothingSent();

    $log = WebhookLog::query()->latest('id')->firstOrFail();
    expect($log->status)->toBe('blocked');
});

it('dispatch project auth listener respects source filter', function () {
    Queue::fake();

    $user = User::factory()->create();
    $project = Project::factory()->create();
    $authUser = ProjectAuthUser::factory()->create([
        'project_id' => $project->id,
        'email' => 'member@example.com',
    ]);

    $apiWebhook = Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Auth API Source',
        'url' => 'https://example.com/auth',
        'events' => ['auth.logout.success'],
        'sources' => ['api'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);
    Webhook::query()->create([
        'project_id' => $project->id,
        'name' => 'Auth CMS Source',
        'url' => 'https://example.com/auth-cms',
        'events' => ['auth.logout.success'],
        'sources' => ['cms'],
        'payload' => true,
        'status' => true,
        'created_by' => $user->id,
    ]);

    event(new ProjectAuthEvent('auth.logout.success', $project, $authUser));

    Queue::assertPushed(SendWebhookJob::class, function (SendWebhookJob $job) use ($apiWebhook) {
        return $job->webhook->id === $apiWebhook->id
            && ($job->payload['source'] ?? null) === 'api'
            && ($job->payload['event'] ?? null) === 'auth.logout.success';
    });
});
