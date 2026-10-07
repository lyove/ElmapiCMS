<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\AssetMetadata;
use App\Models\Project;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

class AssetService
{
    public function __construct(
        protected ?ImageManager $imageManager = null
    ) {
        $this->imageManager ??= new ImageManager(new GdDriver);
    }

    public function createAsset(Project $project, UploadedFile $file, ?int $userId = null): Asset
    {
        $startedAt = microtime(true);
        $createdPaths = [];

        try {
            $originalFilename = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());
            $mimeType = $file->getMimeType();
            $size = $file->getSize();
            $disk = $project->disk ?: config('filesystems.default', 'public');

            $filename = $this->generateUniqueFilename($originalFilename, $extension);
            $filePath = "projects/{$project->uuid}/assets/{$filename}";
            $originalPath = null;

            if ($this->isOptimizableImageExtension($extension)) {
                $processedImage = $this->storeOptimizedImageAndThumbnail($project, $file, $disk, $filename);
                $createdPaths = array_merge($createdPaths, $processedImage['created_paths']);

                $filename = $processedImage['filename'];
                $filePath = $processedImage['path'];
                $originalPath = $processedImage['original_path'];
                $extension = 'webp';
                $mimeType = 'image/webp';
                $size = $processedImage['size'];
            } else {
                $directory = "projects/{$project->uuid}/assets";
                $filePath = $file->storeAs($directory, $filename, $disk);
                $createdPaths[] = $filePath;
            }

            $asset = DB::transaction(function () use (
                $project,
                $filename,
                $originalFilename,
                $mimeType,
                $extension,
                $size,
                $disk,
                $filePath,
                $originalPath,
                $userId
            ) {
                $asset = Asset::create([
                    'project_id' => $project->id,
                    'filename' => $filename,
                    'original_filename' => $originalFilename,
                    'mime_type' => $mimeType,
                    'extension' => $extension,
                    'size' => $size,
                    'disk' => $disk,
                    'path' => $filePath,
                    'original_path' => $originalPath,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);

                if ($asset->isImage()) {
                    [$width, $height] = $this->getImageDimensions($disk, $asset->path);

                    AssetMetadata::create([
                        'asset_id' => $asset->id,
                        'width' => $width,
                        'height' => $height,
                        'alt_text' => pathinfo($originalFilename, PATHINFO_FILENAME),
                    ]);
                }

                return $asset;
            });

            $elapsedMs = (int) ((microtime(true) - $startedAt) * 1000);
            Log::info('Asset upload completed', [
                'asset_id' => $asset->id,
                'project_id' => $project->id,
                'duration_ms' => $elapsedMs,
                'is_image' => $asset->isImage(),
            ]);

            return $asset->load('metadata');
        } catch (\Throwable $exception) {
            $this->cleanupPaths($project->disk ?: config('filesystems.default', 'public'), $createdPaths);

            Log::error('Asset upload failed', [
                'project_id' => $project->id,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }

    public function replaceAssetImage(Project $project, Asset $asset, UploadedFile $file, ?int $userId = null): Asset
    {
        $startedAt = microtime(true);
        $createdPaths = [];
        $oldPaths = [];

        if ($asset->project_id !== $project->id) {
            abort(404);
        }

        $disk = $asset->disk ?: ($project->disk ?: config('filesystems.default', 'public'));
        $oldPaths[] = $asset->path;
        if ($asset->original_path) {
            $oldPaths[] = $asset->original_path;
        }
        if ($asset->isImage()) {
            $oldPaths[] = $asset->getThumbnailPath();
        }

        try {
            $originalFilename = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());
            $filename = $this->generateUniqueFilename($originalFilename, $extension);
            $processedImage = $this->storeOptimizedImageAndThumbnail($project, $file, $disk, $filename);
            $createdPaths = array_merge($createdPaths, $processedImage['created_paths']);

            $updatedAsset = DB::transaction(function () use ($asset, $processedImage, $originalFilename, $userId, $disk) {
                $asset->update([
                    'filename' => $processedImage['filename'],
                    'original_filename' => $originalFilename,
                    'mime_type' => 'image/webp',
                    'extension' => 'webp',
                    'size' => $processedImage['size'],
                    'path' => $processedImage['path'],
                    'original_path' => $processedImage['original_path'],
                    'updated_by' => $userId,
                ]);

                [$width, $height] = $this->getImageDimensions($disk, $processedImage['path']);
                $asset->metadata()->updateOrCreate(
                    ['asset_id' => $asset->id],
                    [
                        'width' => $width,
                        'height' => $height,
                    ]
                );

                return $asset->load('metadata');
            });

            $this->cleanupPaths($disk, $oldPaths);

            $elapsedMs = (int) ((microtime(true) - $startedAt) * 1000);
            Log::info('Asset crop replacement completed', [
                'asset_id' => $asset->id,
                'project_id' => $project->id,
                'duration_ms' => $elapsedMs,
            ]);

            return $updatedAsset;
        } catch (\Throwable $exception) {
            $this->cleanupPaths($disk, $createdPaths);

            Log::error('Asset crop replacement failed', [
                'asset_id' => $asset->id,
                'project_id' => $project->id,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }

    public function deleteAsset(Asset $asset, bool $force = false): void
    {
        $pathsToDelete = [$asset->path];
        if ($asset->original_path) {
            $pathsToDelete[] = $asset->original_path;
        }
        if ($asset->isImage()) {
            $pathsToDelete[] = $asset->getThumbnailPath();
        }

        $this->cleanupPaths($asset->disk, $pathsToDelete);

        if ($force) {
            $asset->metadata()?->delete();
            $asset->forceDelete();

            return;
        }

        $asset->metadata()?->delete();
        $asset->delete();
    }

    private function cleanupPaths(string $disk, array $paths): void
    {
        foreach (array_unique(array_filter($paths)) as $path) {
            if (Storage::disk($disk)->exists($path)) {
                Storage::disk($disk)->delete($path);
            }
        }
    }

    /**
     * @return array{key: string, filename: string, extension: string}
     */
    public function storageKeyDataForOriginalFilename(Project $project, string $originalFilename): array
    {
        $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
        $filename = $this->generateUniqueFilename($originalFilename, $extension);
        $directory = $this->assetDirectoryForProject($project);
        $key = $directory.'/'.$filename;

        return [
            'key' => $key,
            'filename' => $filename,
            'extension' => $extension,
        ];
    }

    public function isOptimizableImageExtensionPublic(string $extension): bool
    {
        return $this->isOptimizableImageExtension($extension);
    }

    private function generateUniqueFilename(string $originalFilename, string $extension): string
    {
        $baseName = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)).'_'.Str::random(8);

        return "{$baseName}.{$extension}";
    }

    private function isOptimizableImageExtension(string $extension): bool
    {
        return in_array(strtolower($extension), ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);
    }

    private function assetDirectoryForProject(Project $project): string
    {
        return "projects/{$project->uuid}/assets";
    }

    /**
     * Convert a direct-uploaded image object (already on the project disk) into WebP + thumbnail + originals copy.
     */
    public function processDirectUploadedImage(Asset $asset): void
    {
        $project = $asset->project;
        if ($project === null) {
            throw new \RuntimeException('Asset has no project.');
        }

        $disk = $asset->disk ?: ($project->disk ?: config('filesystems.default', 'public'));
        $sourceKey = $asset->path;

        $assetDirectory = $this->assetDirectoryForProject($project);
        $originalsDirectory = "{$assetDirectory}/originals";
        $thumbnailsDirectory = "{$assetDirectory}/thumbnails";
        $nameWithoutExtension = pathinfo($asset->filename, PATHINFO_FILENAME);
        $originalExtension = strtolower(pathinfo($asset->filename, PATHINFO_EXTENSION));
        $originalStoredFilename = "{$nameWithoutExtension}.{$originalExtension}";
        $optimizedFilename = "{$nameWithoutExtension}.webp";
        $optimizedPath = "{$assetDirectory}/{$optimizedFilename}";
        $thumbnailPath = "{$thumbnailsDirectory}/{$optimizedFilename}";

        $tempPath = tempnam(sys_get_temp_dir(), 'asset_img');
        $createdPaths = [];

        try {
            file_put_contents($tempPath, Storage::disk($disk)->get($sourceKey));

            Storage::disk($disk)->makeDirectory($originalsDirectory);
            Storage::disk($disk)->makeDirectory($thumbnailsDirectory);

            $originalPath = "{$originalsDirectory}/{$originalStoredFilename}";
            Storage::disk($disk)->put($originalPath, file_get_contents($tempPath), ['visibility' => 'public']);
            $createdPaths[] = $originalPath;

            $sourceImage = $this->imageManager->read($tempPath);
            $optimizedBinary = $sourceImage->encode(new WebpEncoder(quality: 80))->toString();
            Storage::disk($disk)->put($optimizedPath, $optimizedBinary, ['visibility' => 'public']);
            $createdPaths[] = $optimizedPath;

            $thumbnail = $this->imageManager->read($optimizedBinary)->scale(height: 600);
            Storage::disk($disk)->put(
                $thumbnailPath,
                $thumbnail->encode(new WebpEncoder(quality: 80))->toString(),
                ['visibility' => 'public']
            );
            $createdPaths[] = $thumbnailPath;

            if ($sourceKey !== $originalPath && $sourceKey !== $optimizedPath) {
                Storage::disk($disk)->delete($sourceKey);
            }

            if (is_file($tempPath)) {
                @unlink($tempPath);
            }

            $size = Storage::disk($disk)->size($optimizedPath) ?: strlen($optimizedBinary);

            [$width, $height] = $this->getImageDimensions($disk, $optimizedPath);

            DB::transaction(function () use ($asset, $optimizedFilename, $optimizedPath, $originalPath, $size, $width, $height) {
                $asset->update([
                    'filename' => $optimizedFilename,
                    'mime_type' => 'image/webp',
                    'extension' => 'webp',
                    'size' => $size,
                    'path' => $optimizedPath,
                    'original_path' => $originalPath,
                    'pending_image_processing' => false,
                ]);

                $asset->metadata()->updateOrCreate(
                    ['asset_id' => $asset->id],
                    [
                        'width' => $width,
                        'height' => $height,
                        'alt_text' => pathinfo($asset->original_filename, PATHINFO_FILENAME),
                    ]
                );
            });
        } catch (\Throwable $exception) {
            $this->cleanupPaths($disk, $createdPaths);
            if (is_file($tempPath)) {
                @unlink($tempPath);
            }

            $asset->update(['pending_image_processing' => false]);

            Log::error('Direct uploaded image processing failed', [
                'asset_id' => $asset->id,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }

    private function storeOptimizedImageAndThumbnail(Project $project, UploadedFile $file, string $disk, string $filename): array
    {
        $assetDirectory = $this->assetDirectoryForProject($project);
        $originalsDirectory = "{$assetDirectory}/originals";
        $thumbnailsDirectory = "{$assetDirectory}/thumbnails";
        $nameWithoutExtension = pathinfo($filename, PATHINFO_FILENAME);
        $originalExtension = strtolower($file->getClientOriginalExtension());
        $originalFilename = "{$nameWithoutExtension}.{$originalExtension}";
        $optimizedFilename = "{$nameWithoutExtension}.webp";
        $optimizedPath = "{$assetDirectory}/{$optimizedFilename}";
        $thumbnailPath = "{$thumbnailsDirectory}/{$optimizedFilename}";

        Storage::disk($disk)->makeDirectory($originalsDirectory);
        Storage::disk($disk)->makeDirectory($thumbnailsDirectory);

        $originalPath = $file->storeAs($originalsDirectory, $originalFilename, $disk);

        $sourceImage = $this->imageManager->read($file->getRealPath());
        $optimizedBinary = $sourceImage->encode(new WebpEncoder(quality: 80))->toString();
        Storage::disk($disk)->put($optimizedPath, $optimizedBinary);

        $thumbnail = $this->imageManager->read($optimizedBinary)->scale(height: 600);
        Storage::disk($disk)->put(
            $thumbnailPath,
            $thumbnail->encode(new WebpEncoder(quality: 80))->toString()
        );

        $size = Storage::disk($disk)->size($optimizedPath) ?: strlen($optimizedBinary);

        return [
            'filename' => $optimizedFilename,
            'path' => $optimizedPath,
            'original_path' => $originalPath,
            'size' => $size,
            'created_paths' => [$originalPath, $optimizedPath, $thumbnailPath],
        ];
    }

    private function getImageDimensions(string $disk, string $path): array
    {
        if (! Storage::disk($disk)->exists($path)) {
            return [null, null];
        }

        $image = $this->imageManager->read(Storage::disk($disk)->get($path));

        return [$image->width(), $image->height()];
    }
}
