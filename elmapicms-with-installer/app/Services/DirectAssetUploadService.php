<?php

namespace App\Services;

use App\Jobs\ProcessDirectUploadedImageJob;
use App\Models\Asset;
use App\Models\AssetUploadIntent;
use App\Models\Project;
use Aws\S3\S3Client;
use Illuminate\Filesystem\AwsS3V3Adapter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class DirectAssetUploadService
{
    public function __construct(
        protected AssetService $assetService
    ) {}

    /**
     * Master switch + S3 driver present. Per-project availability also requires project.disk = s3.
     */
    public static function isEnabled(): bool
    {
        if (! config('assets.direct_upload.enabled', false)) {
            return false;
        }

        return config('filesystems.disks.s3.driver') === 's3';
    }

    public static function isAvailableForProject(Project $project): bool
    {
        if (! self::isEnabled()) {
            return false;
        }

        $disk = $project->disk ?: 'public';

        return config("filesystems.disks.{$disk}.driver") === 's3';
    }

    public static function maxUploadBytes(): int
    {
        $size = config('assets.max_file_size', '100M');

        if (is_numeric($size)) {
            return (int) $size;
        }

        $units = ['B' => 1, 'K' => 1024, 'M' => 1024 * 1024, 'G' => 1024 * 1024 * 1024];
        $unit = strtoupper(substr((string) $size, -1));
        $value = (int) substr((string) $size, 0, -1);

        if (! isset($units[$unit])) {
            return 100 * 1024 * 1024;
        }

        return $value * $units[$unit];
    }

    /**
     * @return array{url: string, headers: array<string, mixed>, intent_uuid: string, storage_key: string, expires_at: string}
     */
    public function initiateSinglePut(
        Project $project,
        string $originalFilename,
        ?string $clientMimeType,
        int $byteSize,
        ?int $userId
    ): array {
        $this->assertDirectUploadAvailable($project);

        $maxAllowed = self::maxUploadBytes();
        if ($byteSize > $maxAllowed) {
            throw ValidationException::withMessages([
                'byte_size' => __('The file size exceeds the server limit.'),
            ]);
        }

        $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
        $this->assertAllowedExtension($extension);

        $keyData = $this->assetService->storageKeyDataForOriginalFilename($project, $originalFilename);
        $key = $keyData['key'];

        $ttl = now()->addMinutes((int) config('assets.direct_upload.url_ttl_minutes', 15));

        $intent = AssetUploadIntent::query()->create([
            'uuid' => (string) Str::uuid(),
            'project_id' => $project->id,
            'storage_key' => $key,
            'original_filename' => $originalFilename,
            'client_mime_type' => $clientMimeType,
            'max_bytes' => $maxAllowed,
            'mode' => AssetUploadIntent::MODE_SINGLE_PUT,
            's3_multipart_upload_id' => null,
            'expires_at' => $ttl,
        ]);

        $putOptions = array_filter([
            'ACL' => 'public-read',
            'ContentType' => $clientMimeType ?: $this->guessMimeForExtension($extension),
        ]);

        $adapter = $this->s3FilesystemAdapter($project);
        $signed = $adapter->temporaryUploadUrl($key, $ttl, $putOptions);

        return [
            'url' => $signed['url'],
            'headers' => $this->normalizeSignedHeaders($signed['headers'] ?? []),
            'intent_uuid' => $intent->uuid,
            'storage_key' => $key,
            'expires_at' => $ttl->toIso8601String(),
        ];
    }

    /**
     * Completes the multipart upload using {@see listPartsForMultipartUpload} so the browser does not
     * need to read ETag headers (often hidden from JS on cross-origin PUTs unless CORS exposes them).
     */
    public function completeMultipartUpload(
        Project $project,
        string $intentUuid,
        ?int $userId
    ): Asset {
        $this->assertDirectUploadAvailable($project);

        $intent = AssetUploadIntent::query()
            ->where('uuid', $intentUuid)
            ->where('project_id', $project->id)
            ->firstOrFail();

        if ($intent->isExpired()) {
            throw ValidationException::withMessages([
                'intent_uuid' => __('This upload session has expired.'),
            ]);
        }

        if ($intent->mode !== AssetUploadIntent::MODE_MULTIPART) {
            throw ValidationException::withMessages([
                'intent_uuid' => __('Invalid upload session.'),
            ]);
        }

        $this->assertKeyBelongsToProject($project, $intent->storage_key);

        $uploadId = $intent->s3_multipart_upload_id;
        if ($uploadId === null || $uploadId === '') {
            throw ValidationException::withMessages([
                'intent_uuid' => __('Multipart upload was not started.'),
            ]);
        }

        $bucket = $this->bucketName($project);
        $client = $this->s3Client($project);

        $parts = $this->listPartsForMultipartUpload($client, $bucket, $intent->storage_key, $uploadId);
        if ($parts === []) {
            throw ValidationException::withMessages([
                'intent_uuid' => __('No uploaded parts were found. The multipart upload may have failed or is still in progress.'),
            ]);
        }

        $client->completeMultipartUpload([
            'Bucket' => $bucket,
            'Key' => $intent->storage_key,
            'UploadId' => $uploadId,
            'MultipartUpload' => [
                'Parts' => array_map(fn (array $p): array => [
                    'ETag' => $this->normalizeEtag($p['ETag']),
                    'PartNumber' => $p['PartNumber'],
                ], $parts),
            ],
        ]);

        $storageKey = $intent->storage_key;
        $originalFilename = $intent->original_filename;
        $clientMime = $intent->client_mime_type;
        $intent->delete();

        return $this->createAssetFromUploadedObject($project, $storageKey, $originalFilename, $clientMime, $userId);
    }

    /**
     * @return array{intent_uuid: string, storage_key: string, upload_id: string, part_size: int, part_count: int, expires_at: string}
     */
    public function initiateMultipart(
        Project $project,
        string $originalFilename,
        ?string $clientMimeType,
        int $byteSize,
        ?int $partSizeBytes,
        ?int $userId
    ): array {
        $this->assertDirectUploadAvailable($project);

        $maxAllowed = self::maxUploadBytes();
        if ($byteSize > $maxAllowed) {
            throw ValidationException::withMessages([
                'byte_size' => __('The file size exceeds the server limit.'),
            ]);
        }

        $partSize = $partSizeBytes ?? (int) config('assets.direct_upload.multipart_part_size_bytes', 10 * 1024 * 1024);
        $partSize = max(5 * 1024 * 1024, $partSize);

        $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
        $this->assertAllowedExtension($extension);

        $keyData = $this->assetService->storageKeyDataForOriginalFilename($project, $originalFilename);
        $key = $keyData['key'];

        $ttl = now()->addMinutes((int) config('assets.direct_upload.url_ttl_minutes', 15));

        $intent = AssetUploadIntent::query()->create([
            'uuid' => (string) Str::uuid(),
            'project_id' => $project->id,
            'storage_key' => $key,
            'original_filename' => $originalFilename,
            'client_mime_type' => $clientMimeType,
            'max_bytes' => $maxAllowed,
            'mode' => AssetUploadIntent::MODE_MULTIPART,
            's3_multipart_upload_id' => null,
            'expires_at' => $ttl,
        ]);

        $client = $this->s3Client($project);
        $bucket = $this->bucketName($project);

        try {
            $result = $client->createMultipartUpload([
                'Bucket' => $bucket,
                'Key' => $key,
                'ACL' => 'public-read',
                'ContentType' => $clientMimeType ?: $this->guessMimeForExtension($extension),
            ]);

            $awsUploadId = $result['UploadId'] ?? null;
            if ($awsUploadId === null || $awsUploadId === '') {
                throw new RuntimeException('Could not start multipart upload.');
            }

            $intent->update(['s3_multipart_upload_id' => $awsUploadId]);
        } catch (\Throwable $exception) {
            $intent->delete();

            throw $exception;
        }

        $partCount = (int) ceil($byteSize / $partSize);

        return [
            'intent_uuid' => $intent->uuid,
            'storage_key' => $key,
            'upload_id' => $awsUploadId,
            'part_size' => $partSize,
            'part_count' => max(1, $partCount),
            'expires_at' => $ttl->toIso8601String(),
        ];
    }

    /**
     * @return array{url: string, headers: array<string, mixed>, expires_at: string}
     */
    public function presignMultipartPart(
        Project $project,
        string $intentUuid,
        int $partNumber,
        ?int $contentLength
    ): array {
        $this->assertDirectUploadAvailable($project);

        $intent = AssetUploadIntent::query()
            ->where('uuid', $intentUuid)
            ->where('project_id', $project->id)
            ->firstOrFail();

        if ($intent->isExpired()) {
            throw ValidationException::withMessages([
                'intent_uuid' => __('This upload session has expired.'),
            ]);
        }

        if ($intent->mode !== AssetUploadIntent::MODE_MULTIPART || $intent->s3_multipart_upload_id === null) {
            throw ValidationException::withMessages([
                'intent_uuid' => __('Invalid multipart upload session.'),
            ]);
        }

        $this->assertKeyBelongsToProject($project, $intent->storage_key);

        if ($partNumber < 1) {
            throw ValidationException::withMessages([
                'part_number' => __('Invalid part number.'),
            ]);
        }

        $client = $this->s3Client($project);
        $bucket = $this->bucketName($project);

        $command = $client->getCommand('UploadPart', array_filter([
            'Bucket' => $bucket,
            'Key' => $intent->storage_key,
            'UploadId' => $intent->s3_multipart_upload_id,
            'PartNumber' => $partNumber,
            'ContentLength' => $contentLength,
        ]));

        $expires = now()->addMinutes((int) config('assets.direct_upload.url_ttl_minutes', 15));
        $request = $client->createPresignedRequest($command, $expires);

        return [
            'url' => (string) $request->getUri(),
            'headers' => [],
            'expires_at' => $expires->toIso8601String(),
        ];
    }

    public function finalizeSinglePut(
        Project $project,
        string $intentUuid,
        ?int $userId
    ): Asset {
        $this->assertDirectUploadAvailable($project);

        $intent = AssetUploadIntent::query()
            ->where('uuid', $intentUuid)
            ->where('project_id', $project->id)
            ->firstOrFail();

        if ($intent->isExpired()) {
            throw ValidationException::withMessages([
                'intent_uuid' => __('This upload session has expired.'),
            ]);
        }

        if ($intent->mode !== AssetUploadIntent::MODE_SINGLE_PUT) {
            throw ValidationException::withMessages([
                'intent_uuid' => __('Invalid upload session.'),
            ]);
        }

        $this->assertKeyBelongsToProject($project, $intent->storage_key);

        $disk = $this->diskName($project);
        if (! Storage::disk($disk)->exists($intent->storage_key)) {
            throw ValidationException::withMessages([
                'intent_uuid' => __('The file was not uploaded or is not visible yet. Try again.'),
            ]);
        }

        $size = (int) Storage::disk($disk)->size($intent->storage_key);
        if ($size > $intent->max_bytes) {
            Storage::disk($disk)->delete($intent->storage_key);
            $intent->delete();

            throw ValidationException::withMessages([
                'intent_uuid' => __('The uploaded file exceeds the allowed size.'),
            ]);
        }

        if ($size < 1) {
            Storage::disk($disk)->delete($intent->storage_key);
            $intent->delete();

            throw ValidationException::withMessages([
                'intent_uuid' => __('The uploaded file is empty.'),
            ]);
        }

        $storageKey = $intent->storage_key;
        $originalFilename = $intent->original_filename;
        $clientMime = $intent->client_mime_type;
        $intent->delete();

        return $this->createAssetFromUploadedObject(
            $project,
            $storageKey,
            $originalFilename,
            $clientMime,
            $userId
        );
    }

    protected function createAssetFromUploadedObject(
        Project $project,
        string $storageKey,
        string $originalFilename,
        ?string $clientMimeType,
        ?int $userId
    ): Asset {
        $disk = $this->diskName($project);
        $size = (int) Storage::disk($disk)->size($storageKey);
        $filename = basename($storageKey);
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $mimeType = Storage::disk($disk)->mimeType($storageKey) ?: ($clientMimeType ?? 'application/octet-stream');

        return DB::transaction(function () use ($project, $storageKey, $originalFilename, $mimeType, $extension, $size, $disk, $filename, $userId) {
            if ($this->assetService->isOptimizableImageExtensionPublic($extension)) {
                $asset = Asset::query()->create([
                    'project_id' => $project->id,
                    'filename' => $filename,
                    'original_filename' => $originalFilename,
                    'mime_type' => $mimeType,
                    'extension' => $extension,
                    'size' => $size,
                    'disk' => $disk,
                    'path' => $storageKey,
                    'original_path' => null,
                    'pending_image_processing' => true,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);

                ProcessDirectUploadedImageJob::dispatch($asset->id)->afterCommit();

                return $asset->load('metadata');
            }

            $asset = Asset::query()->create([
                'project_id' => $project->id,
                'filename' => $filename,
                'original_filename' => $originalFilename,
                'mime_type' => $mimeType,
                'extension' => $extension,
                'size' => $size,
                'disk' => $disk,
                'path' => $storageKey,
                'original_path' => null,
                'pending_image_processing' => false,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            return $asset->load('metadata');
        });
    }

    protected function assertDirectUploadAvailable(Project $project): void
    {
        if (! self::isAvailableForProject($project)) {
            throw ValidationException::withMessages([
                'direct_upload' => __('Direct upload is not enabled or this project is not using S3-compatible storage.'),
            ]);
        }
    }

    protected function assertAllowedExtension(string $extension): void
    {
        $allowed = config('assets.allowed_upload_mimes', []);
        if (! in_array($extension, $allowed, true)) {
            throw ValidationException::withMessages([
                'original_filename' => __('This file type is not allowed.'),
            ]);
        }
    }

    protected function assertKeyBelongsToProject(Project $project, string $key): void
    {
        $prefix = "projects/{$project->uuid}/assets/";
        if (! str_starts_with($key, $prefix)) {
            abort(403);
        }

        if (str_contains($key, '..')) {
            abort(403);
        }
    }

    protected function diskName(Project $project): string
    {
        return $project->disk ?: 's3';
    }

    protected function s3FilesystemAdapter(Project $project): AwsS3V3Adapter
    {
        $disk = Storage::disk($this->diskName($project));

        if (! $disk instanceof AwsS3V3Adapter) {
            throw new RuntimeException('Direct upload requires the s3 filesystem driver.');
        }

        return $disk;
    }

    protected function s3Client(Project $project): S3Client
    {
        return $this->s3FilesystemAdapter($project)->getClient();
    }

    protected function bucketName(Project $project): string
    {
        $name = config('filesystems.disks.'.$this->diskName($project).'.bucket');

        return is_string($name) ? $name : '';
    }

    /**
     * @param  array<string, mixed>  $headers
     * @return array<string, mixed>
     */
    protected function normalizeSignedHeaders(array $headers): array
    {
        $out = [];
        foreach ($headers as $k => $v) {
            if (is_string($k) && $k !== '') {
                $out[$k] = is_array($v) ? ($v[0] ?? '') : $v;
            }
        }

        return $out;
    }

    protected function guessMimeForExtension(string $extension): string
    {
        return match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            'zip' => 'application/zip',
            'mp4' => 'video/mp4',
            default => 'application/octet-stream',
        };
    }

    protected function normalizeEtag(string $etag): string
    {
        $etag = trim($etag);
        if (str_starts_with($etag, '"') && str_ends_with($etag, '"')) {
            return $etag;
        }

        return '"'.trim($etag, '"').'"';
    }

    /**
     * @return array<int, array{PartNumber: int, ETag: string}>
     */
    protected function listPartsForMultipartUpload(
        S3Client $client,
        string $bucket,
        string $key,
        string $uploadId
    ): array {
        $all = [];
        $partNumberMarker = null;

        do {
            $params = [
                'Bucket' => $bucket,
                'Key' => $key,
                'UploadId' => $uploadId,
            ];
            if ($partNumberMarker !== null) {
                $params['PartNumberMarker'] = $partNumberMarker;
            }

            $result = $client->listParts($params);

            foreach ($result['Parts'] ?? [] as $part) {
                $all[] = [
                    'PartNumber' => (int) ($part['PartNumber'] ?? 0),
                    'ETag' => (string) ($part['ETag'] ?? ''),
                ];
            }

            $partNumberMarker = $result['NextPartNumberMarker'] ?? null;
        } while (! empty($result['IsTruncated']));

        usort($all, fn (array $a, array $b): int => $a['PartNumber'] <=> $b['PartNumber']);

        return $all;
    }
}
