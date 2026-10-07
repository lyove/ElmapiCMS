<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Project;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;
use ZipArchive;

class ExportPackageService
{
    /**
     * Build a portable ZIP containing manifest.json and declared asset binaries.
     *
     * @param  array<string, mixed>  $manifest
     */
    public function buildZip(Project $project, array $manifest): string
    {
        $zipPath = tempnam(sys_get_temp_dir(), 'elmapicms-export-');
        if ($zipPath === false) {
            throw new RuntimeException('Unable to allocate a temporary export file.');
        }

        $stagingDirectory = $zipPath.'-assets';
        File::makeDirectory($stagingDirectory);
        $zip = new ZipArchive;
        $zipIsOpen = false;

        try {
            if ($zip->open($zipPath, ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('Unable to create the export archive.');
            }
            $zipIsOpen = true;

            $manifestJson = json_encode(
                $manifest,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            );
            if (! $zip->addFromString('manifest.json', $manifestJson)) {
                throw new RuntimeException('Unable to add the manifest to the export archive.');
            }

            $assetsByArchivePath = $project->assets()
                ->whereIn('uuid', $this->assetUuids($manifest))
                ->get()
                ->keyBy(fn (Asset $asset): string => ProjectExportService::archivePathForAsset($asset));

            foreach (array_keys($manifest['assets'] ?? []) as $archivePath) {
                $asset = $assetsByArchivePath->get($archivePath);
                if (! $asset instanceof Asset) {
                    throw new RuntimeException("Export asset [{$archivePath}] could not be found.");
                }

                $localPath = $stagingDirectory.'/'.basename($archivePath);
                $this->copyAssetToLocalPath($asset, $localPath);

                if (! $zip->addFile($localPath, $archivePath)) {
                    throw new RuntimeException("Unable to add asset [{$archivePath}] to the export archive.");
                }
            }

            $zipWasClosed = $zip->close();
            $zipIsOpen = false;
            if (! $zipWasClosed) {
                throw new RuntimeException('Unable to finalize the export archive.');
            }

            return $zipPath;
        } catch (Throwable $exception) {
            if ($zipIsOpen) {
                $zip->close();
            }
            File::delete($zipPath);

            throw $exception;
        } finally {
            File::deleteDirectory($stagingDirectory);
        }
    }

    /**
     * @param  array<string, mixed>  $manifest
     * @return array<int, string>
     */
    private function assetUuids(array $manifest): array
    {
        return collect($manifest['assets'] ?? [])
            ->pluck('uuid')
            ->filter(fn (mixed $uuid): bool => is_string($uuid) && $uuid !== '')
            ->values()
            ->all();
    }

    private function copyAssetToLocalPath(Asset $asset, string $localPath): void
    {
        $sourcePath = $asset->original_path ?: $asset->path;
        $source = Storage::disk($asset->disk)->readStream($sourcePath);
        if ($source === false) {
            throw new RuntimeException("Unable to read asset [{$asset->original_filename}].");
        }

        $destination = fopen($localPath, 'wb');
        if ($destination === false) {
            fclose($source);

            throw new RuntimeException('Unable to create a temporary asset file.');
        }

        try {
            if (stream_copy_to_stream($source, $destination) === false) {
                throw new RuntimeException("Unable to stage asset [{$asset->original_filename}].");
            }
        } finally {
            fclose($source);
            fclose($destination);
        }
    }
}
