<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\WebhookRequest;
use App\Http\Resources\WebhookResource;
use App\Models\Project;
use App\Models\Webhook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var Project $project */
        $project = $request->attributes->get('project');

        $webhooks = $project->webhooks()
            ->with('collections:id,uuid,name,slug')
            ->orderBy('id')
            ->get();

        return response()->json(WebhookResource::collection($webhooks));
    }

    public function show(Request $request, Webhook $webhook): WebhookResource|JsonResponse
    {
        if (! $this->webhookBelongsToProject($request, $webhook)) {
            return response()->json(['message' => 'Webhook not found.'], 404);
        }

        return new WebhookResource($webhook->load('collections:id,uuid,name,slug'));
    }

    public function store(WebhookRequest $request): WebhookResource|JsonResponse
    {
        /** @var Project $project */
        $project = $request->attributes->get('project');

        $createdBy = (int) ($request->user()?->id ?? $project->members()->value('users.id'));
        if (! $createdBy) {
            return response()->json([
                'message' => 'Unable to determine webhook creator.',
            ], 422);
        }

        $validated = $request->validated();

        $webhook = $project->webhooks()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'url' => $validated['url'],
            'secret' => $validated['secret'] ?? null,
            'events' => $validated['events'],
            'sources' => $validated['sources'],
            'payload' => $validated['payload'] ?? true,
            'status' => $validated['status'] ?? true,
            'created_by' => $createdBy,
        ]);

        $webhook->collections()->sync($validated['collection_ids'] ?? []);

        return new WebhookResource($webhook->load('collections:id,uuid,name,slug'));
    }

    public function update(WebhookRequest $request, Webhook $webhook): WebhookResource|JsonResponse
    {
        if (! $this->webhookBelongsToProject($request, $webhook)) {
            return response()->json(['message' => 'Webhook not found.'], 404);
        }

        $validated = $request->validated();

        $data = [
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'url' => $validated['url'],
            'events' => $validated['events'],
            'sources' => $validated['sources'],
            'payload' => $validated['payload'] ?? true,
            'status' => $validated['status'] ?? true,
        ];

        if (array_key_exists('secret', $validated)) {
            $data['secret'] = $validated['secret'];
        }

        $webhook->update($data);

        $webhook->collections()->sync($validated['collection_ids'] ?? []);

        return new WebhookResource($webhook->load('collections:id,uuid,name,slug'));
    }

    public function destroy(Request $request, Webhook $webhook): JsonResponse
    {
        if (! $this->webhookBelongsToProject($request, $webhook)) {
            return response()->json(['message' => 'Webhook not found.'], 404);
        }

        $webhook->collections()->detach();
        $webhook->delete();

        return response()->json(null, 204);
    }

    public function logs(Request $request, Webhook $webhook): JsonResponse
    {
        if (! $this->webhookBelongsToProject($request, $webhook)) {
            return response()->json(['message' => 'Webhook not found.'], 404);
        }

        $maxPerPage = max(1, (int) config('webhooks.logs_max_per_page', 100));
        $perPage = min(max(1, (int) $request->integer('paginate', 25)), $maxPerPage);

        $logs = $webhook->logs()
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json($logs);
    }

    private function webhookBelongsToProject(Request $request, Webhook $webhook): bool
    {
        /** @var Project $project */
        $project = $request->attributes->get('project');

        return $webhook->project_id === $project->id;
    }
}
