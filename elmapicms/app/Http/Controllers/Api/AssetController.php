<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkAssetMetadataUpdateRequest;
use App\Http\Requests\BulkAssetUploadRequest;
use App\Http\Requests\CompleteMultipartDirectAssetUploadRequest;
use App\Http\Requests\FinalizeDirectAssetUploadRequest;
use App\Http\Requests\InitiateDirectAssetUploadRequest;
use App\Http\Requests\InitiateMultipartDirectAssetUploadRequest;
use App\Http\Requests\PresignMultipartPartRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Models\Project;
use App\Services\AssetService;
use App\Services\DirectAssetUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class AssetController extends Controller
{
    public function __construct(
        protected AssetService $assetService,
        protected DirectAssetUploadService $directAssetUploadService,
    ) {}

    /**
     * List project assets
     * GET /api/files
     *
     * @OA\Get(
     *     path="/api/files",
     *     summary="List assets",
     *     description="Get all assets for the current project with optional filtering",
     *     tags={"Assets"},
     *     security={{"bearerAuth": {}}},
     *
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         description="Search assets by filename, original filename, or mime type",
     *
     *         @OA\Schema(type="string", example="image")
     *     ),
     *
     *     @OA\Parameter(
     *         name="type",
     *         in="query",
     *         description="Filter by asset type",
     *
     *         @OA\Schema(type="string", enum={"image", "video", "audio", "document"})
     *     ),
     *
     *     @OA\Parameter(
     *         name="paginate",
     *         in="query",
     *         description="Number of items per page for pagination",
     *
     *         @OA\Schema(type="integer", example=20)
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Assets retrieved successfully",
     *
     *         @OA\JsonContent(
     *             type="array",
     *
     *             @OA\Items(
     *                 type="object",
     *
     *                 @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *                 @OA\Property(property="filename", type="string", example="my-image.jpg"),
     *                 @OA\Property(property="mime_type", type="string", example="image/jpeg"),
     *                 @OA\Property(property="size", type="string", example="1.0 MB"),
     *                 @OA\Property(property="url", type="string", example="https://example.com/storage/assets/image.jpg"),
     *                 @OA\Property(property="original_url", type="string", nullable=true, example="https://example.com/storage/assets/originals/image.jpg"),
     *                 @OA\Property(property="thumbnail_url", type="string", example="https://example.com/storage/assets/thumbnails/image.jpg"),
     *                 @OA\Property(property="metadata", type="object", example={})
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     )
     * )
     */
    public function index(Request $request)
    {
        $this->ensureAbility('read');
        $project = $request->attributes->get('project');

        $query = Asset::where('project_id', $project->id)->with('metadata');

        // Optional search and filters similar to internal controller but simplified
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('filename', 'like', "%{$search}%")
                    ->orWhere('original_filename', 'like', "%{$search}%")
                    ->orWhere('mime_type', 'like', "%{$search}%");
            });
        }

        if ($type = $request->query('type')) {
            $map = [
                'image' => config('assets.image_extensions'),
                'video' => config('assets.video_extensions'),
                'audio' => config('assets.audio_extensions'),
                'document' => config('assets.document_extensions'),
            ];
            if (isset($map[$type])) {
                $query->whereIn('extension', $map[$type]);
            }
        }

        $query->orderBy('created_at', 'desc');

        $paginate = max(1, min(100, (int) $request->query('paginate', 25)));
        $assets = $query->paginate($paginate)->appends($request->query());

        return AssetResource::collection($assets);
    }

    /**
     * Get asset by ID or UUID
     * GET /api/files/{identifier}
     *
     * @OA\Get(
     *     path="/api/files/{identifier}",
     *     summary="Get asset by ID or UUID",
     *     description="Retrieve a specific asset by its ID or UUID",
     *     tags={"Assets"},
     *     security={{"bearerAuth": {}}},
     *
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *
     *     @OA\Parameter(
     *         name="identifier",
     *         in="path",
     *         required=true,
     *         description="Asset ID or UUID",
     *
     *         @OA\Schema(type="string", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Asset retrieved successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *             @OA\Property(property="filename", type="string", example="my-image.jpg"),
     *             @OA\Property(property="mime_type", type="string", example="image/jpeg"),
     *             @OA\Property(property="size", type="string", example="1.0 MB"),
     *             @OA\Property(property="url", type="string", example="https://example.com/storage/assets/image.jpg"),
     *             @OA\Property(property="original_url", type="string", nullable=true, example="https://example.com/storage/assets/originals/image.jpg"),
     *             @OA\Property(property="thumbnail_url", type="string", example="https://example.com/storage/assets/thumbnails/image.jpg"),
     *             @OA\Property(property="metadata", type="object", example={})
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Asset not found"
     *     )
     * )
     */
    public function show(Request $request, string $identifier)
    {
        $this->ensureAbility('read');
        $project = $request->attributes->get('project');
        $asset = $this->resolveAsset($project, $identifier);
        if (! $asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }
        $asset->load('metadata');

        return new AssetResource($asset);
    }

    /**
     * Get asset by original filename
     * GET /api/files/name/{filename}
     *
     * @OA\Get(
     *     path="/api/files/name/{filename}",
     *     summary="Get asset by filename",
     *     description="Retrieve a specific asset by its original filename",
     *     tags={"Assets"},
     *     security={{"bearerAuth": {}}},
     *
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *
     *     @OA\Parameter(
     *         name="filename",
     *         in="path",
     *         required=true,
     *         description="Original filename of the asset",
     *
     *         @OA\Schema(type="string", example="my-image.jpg")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Asset retrieved successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *             @OA\Property(property="filename", type="string", example="my-image.jpg"),
     *             @OA\Property(property="mime_type", type="string", example="image/jpeg"),
     *             @OA\Property(property="size", type="string", example="1.0 MB"),
     *             @OA\Property(property="url", type="string", example="https://example.com/storage/assets/image.jpg"),
     *             @OA\Property(property="original_url", type="string", nullable=true, example="https://example.com/storage/assets/originals/image.jpg"),
     *             @OA\Property(property="thumbnail_url", type="string", example="https://example.com/storage/assets/thumbnails/image.jpg"),
     *             @OA\Property(property="metadata", type="object", example={})
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Asset not found"
     *     )
     * )
     */
    public function showByName(Request $request, string $filename)
    {
        $this->ensureAbility('read');
        $project = $request->attributes->get('project');
        $asset = Asset::where('project_id', $project->id)->where('original_filename', $filename)->first();
        if (! $asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }
        $asset->load('metadata');

        return new AssetResource($asset);
    }

    /**
     * Upload new asset
     * POST /api/files (multipart form field "file")
     *
     * @OA\Post(
     *     path="/api/files",
     *     summary="Upload asset",
     *     description="Upload a new file asset to the project",
     *     tags={"Assets"},
     *     security={{"bearerAuth": {}}},
     *
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *
     *             @OA\Schema(
     *
     *                 @OA\Property(
     *                     property="file",
     *                     type="string",
     *                     format="binary",
     *                     description="File to upload"
     *                 )
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Asset uploaded successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="uuid", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *             @OA\Property(property="filename", type="string", example="my-image.jpg"),
     *             @OA\Property(property="mime_type", type="string", example="image/jpeg"),
     *             @OA\Property(property="size", type="string", example="1.0 MB"),
     *             @OA\Property(property="url", type="string", example="https://example.com/storage/assets/image.jpg"),
     *             @OA\Property(property="original_url", type="string", nullable=true, example="https://example.com/storage/assets/originals/image.jpg"),
     *             @OA\Property(property="thumbnail_url", type="string", example="https://example.com/storage/assets/thumbnails/image.jpg"),
     *             @OA\Property(property="metadata", type="object", example={})
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Invalid file or validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=413,
     *         description="Payload too large - File size exceeds limit"
     *     )
     * )
     */
    public function store(Request $request)
    {
        $this->ensureAbility('create');
        $project = $request->attributes->get('project');
        $validator = validator($request->all(), [
            'file' => 'required|file|mimes:'.implode(',', config('assets.allowed_upload_mimes')).'|max:102400',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $asset = $this->assetService->createAsset($project, $request->file('file'), null);

        return (new AssetResource($asset))->response()->setStatusCode(201);
    }

    public function directUploadInitiate(InitiateDirectAssetUploadRequest $request)
    {
        $this->ensureAbility('create');
        $project = $request->attributes->get('project');
        $payload = $this->directAssetUploadService->initiateSinglePut(
            $project,
            $request->string('original_filename')->toString(),
            $request->input('client_mime_type'),
            (int) $request->input('byte_size'),
            null,
        );

        return response()->json(array_merge(['success' => true], $payload));
    }

    public function directUploadFinalize(FinalizeDirectAssetUploadRequest $request)
    {
        $this->ensureAbility('create');
        $project = $request->attributes->get('project');
        $asset = $this->directAssetUploadService->finalizeSinglePut(
            $project,
            $request->string('intent_uuid')->toString(),
            null,
        );

        return (new AssetResource($asset->load('metadata')))->response()->setStatusCode(201);
    }

    public function directMultipartInitiate(InitiateMultipartDirectAssetUploadRequest $request)
    {
        $this->ensureAbility('create');
        $project = $request->attributes->get('project');
        $payload = $this->directAssetUploadService->initiateMultipart(
            $project,
            $request->string('original_filename')->toString(),
            $request->input('client_mime_type'),
            (int) $request->input('byte_size'),
            $request->filled('part_size_bytes') ? (int) $request->input('part_size_bytes') : null,
            null,
        );

        return response()->json(array_merge(['success' => true], $payload));
    }

    public function directMultipartPartUrl(PresignMultipartPartRequest $request)
    {
        $this->ensureAbility('create');
        $project = $request->attributes->get('project');
        $payload = $this->directAssetUploadService->presignMultipartPart(
            $project,
            $request->string('intent_uuid')->toString(),
            (int) $request->input('part_number'),
            $request->filled('content_length') ? (int) $request->input('content_length') : null,
        );

        return response()->json(array_merge(['success' => true], $payload));
    }

    public function directMultipartComplete(CompleteMultipartDirectAssetUploadRequest $request)
    {
        $this->ensureAbility('create');
        $project = $request->attributes->get('project');
        $asset = $this->directAssetUploadService->completeMultipartUpload(
            $project,
            $request->string('intent_uuid')->toString(),
            null,
        );

        return (new AssetResource($asset->load('metadata')))->response()->setStatusCode(201);
    }

    public function bulkUpload(BulkAssetUploadRequest $request)
    {
        $this->ensureAbility('create');
        $project = $request->attributes->get('project');
        $files = $request->file('files', []);
        $createdAssets = [];

        try {
            foreach ($files as $file) {
                $createdAssets[] = $this->assetService->createAsset($project, $file, null);
            }
        } catch (\Throwable $exception) {
            foreach ($createdAssets as $asset) {
                try {
                    $this->assetService->deleteAsset($asset->fresh() ?? $asset, true);
                } catch (\Throwable $cleanupException) {
                    // Ignore cleanup failures to preserve the original exception context.
                }
            }

            throw $exception;
        }

        return response()->json([
            'message' => 'Bulk assets uploaded successfully.',
            'data' => AssetResource::collection(collect($createdAssets))->resolve(),
        ], 201);
    }

    public function bulkUpdateMetadata(BulkAssetMetadataUpdateRequest $request)
    {
        $this->ensureAbility('update');
        $project = $request->attributes->get('project');
        $items = $request->validated('items');
        $uuids = collect($items)->pluck('uuid')->unique()->values();

        $assets = Asset::query()
            ->where('project_id', $project->id)
            ->whereIn('uuid', $uuids)
            ->with('metadata')
            ->get()
            ->keyBy('uuid');

        $missing = $uuids->filter(fn (string $uuid) => ! $assets->has($uuid))->values();
        if ($missing->isNotEmpty()) {
            throw ValidationException::withMessages([
                'items' => ['Some assets do not exist in this project: '.$missing->implode(', ')],
            ]);
        }

        $updatedAssets = DB::transaction(function () use ($items, $assets) {
            $results = [];
            $metadataKeys = ['alt_text', 'title', 'caption', 'description', 'author', 'copyright'];

            foreach ($items as $item) {
                /** @var Asset $asset */
                $asset = $assets->get($item['uuid']);
                $metadataPayload = collect($item)->only($metadataKeys)->all();

                if (! empty($metadataPayload)) {
                    $asset->metadata()->updateOrCreate(
                        ['asset_id' => $asset->id],
                        $metadataPayload
                    );
                }

                $asset->updated_by = null;
                $asset->save();
                $asset->load('metadata');
                $results[] = $asset;
            }

            return $results;
        });

        return response()->json([
            'message' => 'Bulk asset metadata updated successfully.',
            'data' => AssetResource::collection(collect($updatedAssets))->resolve(),
        ]);
    }

    /**
     * Delete asset
     * DELETE /api/files/{identifier}
     *
     * @OA\Delete(
     *     path="/api/files/{identifier}",
     *     summary="Delete asset",
     *     description="Delete an asset (soft delete by default, or permanent with force parameter)",
     *     tags={"Assets"},
     *     security={{"bearerAuth": {}}},
     *
     *     @OA\Parameter(
     *         name="project-id",
     *         in="header",
     *         required=true,
     *         description="Project identifier (UUID)",
     *
     *         @OA\Schema(type="string", format="uuid", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *
     *     @OA\Parameter(
     *         name="identifier",
     *         in="path",
     *         required=true,
     *         description="Asset ID or UUID",
     *
     *         @OA\Schema(type="string", example="550e8400-e29b-41d4-a716-446655440000")
     *     ),
     *
     *     @OA\Parameter(
     *         name="force",
     *         in="query",
     *         description="Force permanent deletion",
     *
     *         @OA\Schema(type="boolean", example=true)
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Asset deleted successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Asset deleted successfully")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing API token"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - API token doesn't have required permissions"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Asset not found"
     *     )
     * )
     */
    public function destroy(Request $request, string $identifier)
    {
        $this->ensureAbility('delete');
        $project = $request->attributes->get('project');
        $asset = $this->resolveAsset($project, $identifier, true);
        if (! $asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }
        if ($request->boolean('force')) {
            $this->assetService->deleteAsset($asset, true);

            return response()->json(['success' => true, 'message' => 'Asset permanently deleted']);
        }

        $this->assetService->deleteAsset($asset);

        return response()->json([
            'success' => true,
            'message' => 'Asset deleted successfully',
        ]);
    }

    /* ------------------------------------------------------------- */

    private function ensureAbility(string $ability)
    {
        $token = request()->attributes->get('project_api_token') ?: auth('sanctum')->user()?->currentAccessToken();

        if ($token && ($token->can($ability) || $token->can('*'))) {
            return;
        }

        abort(response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403));
    }

    private function resolveAsset(Project $project, string $identifier, bool $withTrashed = false): ?Asset
    {
        $query = Asset::query();
        if ($withTrashed) {
            $query->withTrashed();
        }
        $query->where('project_id', $project->id)
            ->where(function ($q) use ($identifier) {
                if (is_numeric($identifier)) {
                    $q->where('id', $identifier);
                } else {
                    $q->where('uuid', $identifier);
                }
            });

        return $query->first();
    }
}
