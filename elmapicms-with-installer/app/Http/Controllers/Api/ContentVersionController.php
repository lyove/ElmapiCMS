<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ContentVersionLabelRequest;
use App\Http\Resources\ContentEntryResource;
use App\Http\Resources\ContentEntryVersionResource;
use App\Models\Collection;
use App\Services\ContentEntryVersioningService;
use Illuminate\Http\Request;

class ContentVersionController extends Controller
{
    public function __construct(
        private ContentEntryVersioningService $versioningService
    ) {}

    /**
     * GET /api/{collection}/{uuid}/versions
     */
    public function index(Request $request, string $collection, string $uuid)
    {
        if (! auth('sanctum')->user() || ! auth('sanctum')->user()->tokenCan('read')) {
            return response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403);
        }

        $project = $request->attributes->get('project');

        $collectionModel = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (! $collectionModel) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $entry = $collectionModel->contentEntries()->where('uuid', $uuid)->first();

        if (! $entry) {
            return response()->json(['message' => 'Content not found.'], 404);
        }

        $versions = $entry->versions()
            ->with('creator:id,name')
            ->orderByDesc('version_number')
            ->get();

        $versions->each(function ($version) use ($entry) {
            $version->setRelation('entry', $entry);
        });

        return ContentEntryVersionResource::collection($versions);
    }

    /**
     * GET /api/{collection}/{uuid}/versions/{version}
     */
    public function show(Request $request, string $collection, string $uuid, int $version)
    {
        if (! auth('sanctum')->user() || ! auth('sanctum')->user()->tokenCan('read')) {
            return response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403);
        }

        $project = $request->attributes->get('project');

        $collectionModel = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->with('fields.children')
            ->first();

        if (! $collectionModel) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $entry = $collectionModel->contentEntries()->where('uuid', $uuid)->first();

        if (! $entry) {
            return response()->json(['message' => 'Content not found.'], 404);
        }

        $versionModel = $entry->versions()
            ->where('version_number', $version)
            ->with('creator:id,name')
            ->first();

        if (! $versionModel) {
            return response()->json(['message' => 'Version not found.'], 404);
        }

        $versionModel->setRelation('entry', $entry);

        return (new ContentEntryVersionResource($versionModel))->withSnapshot();
    }

    /**
     * POST /api/{collection}/{uuid}/versions/{version}/revert
     */
    public function revert(Request $request, string $collection, string $uuid, int $version)
    {
        if (! auth('sanctum')->user() || ! auth('sanctum')->user()->tokenCan('update')) {
            return response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403);
        }

        $project = $request->attributes->get('project');

        $collectionModel = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (! $collectionModel) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $entry = $collectionModel->contentEntries()->where('uuid', $uuid)->first();

        if (! $entry) {
            return response()->json(['message' => 'Content not found.'], 404);
        }

        $target = $entry->versions()->where('version_number', $version)->first();
        if (! $target) {
            return response()->json(['message' => 'Version not found.'], 404);
        }

        $newVersion = $this->versioningService->revert($entry, $version);

        $entry->refresh();
        $entry->load(['publishedVersion', 'collection.fields.children']);

        return response()->json([
            'message' => "Reverted to version {$version} (new version v{$newVersion->version_number}).",
            'version' => (new ContentEntryVersionResource($newVersion->setRelation('entry', $entry)))->toArray($request),
            'entry' => (new ContentEntryResource($entry))->fromSnapshot()->toArray($request),
        ]);
    }

    /**
     * PATCH /api/{collection}/{uuid}/versions/{version}
     */
    public function updateLabel(ContentVersionLabelRequest $request, string $collection, string $uuid, int $version)
    {
        if (! auth('sanctum')->user() || ! auth('sanctum')->user()->tokenCan('update')) {
            return response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403);
        }

        $project = $request->attributes->get('project');

        $collectionModel = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (! $collectionModel) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $entry = $collectionModel->contentEntries()->where('uuid', $uuid)->first();

        if (! $entry) {
            return response()->json(['message' => 'Content not found.'], 404);
        }

        $target = $entry->versions()->where('version_number', $version)->first();
        if (! $target) {
            return response()->json(['message' => 'Version not found.'], 404);
        }

        $validated = $request->validated();

        if (array_key_exists('label', $validated)) {
            $target->label = $validated['label'];
        }
        if (array_key_exists('description', $validated)) {
            $target->description = $validated['description'];
        }

        $target->save();
        $target->setRelation('entry', $entry);

        return new ContentEntryVersionResource($target);
    }
}
