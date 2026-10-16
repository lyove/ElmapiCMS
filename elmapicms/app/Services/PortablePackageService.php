<?php

namespace App\Services;

use App\Data\PortablePackage;
use App\Models\Asset;
use App\Models\Project;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File as FileRule;
use RuntimeException;
use Throwable;
use ZipArchive;

class PortablePackageService
{
    public function __construct(
        protected AssetService $assetService,
    ) {}

    public function read(UploadedFile $file): PortablePackage
    {
        if (strtolower($file->getClientOriginalExtension()) === 'zip') {
            return $this->readZip($file);
        }

        $manifest = $this->decodeManifest(File::get($file->getRealPath()));
        if (array_key_exists('format', $manifest)) {
            $this->validatePortableManifest($manifest);
        }

        return new PortablePackage($manifest);
    }

    /**
     * @return array{assets: array<string, Asset>, created: array<int, Asset>, unresolved: int}
     */
    public function resolveAssets(Project $project, PortablePackage $package, ?int $userId): array
    {
        $assetDefinitions = $this->assetDefinitions($package->manifest);
        $resolved = [];
        $created = [];
        $unresolved = 0;

        try {
            foreach ($assetDefinitions as $archivePath => $metadata) {
                $temporaryPath = $package->assetFiles[$archivePath] ?? null;
                if ($temporaryPath !== null) {
                    $originalFilename = $this->originalFilename($metadata, $archivePath);
                    $uploadedFile = new UploadedFile(
                        $temporaryPath,
                        $originalFilename,
                        is_string($metadata['mime_type'] ?? null) ? $metadata['mime_type'] : null,
                        null,
                        true,
                    );

                    Validator::validate(
                        ['file' => $uploadedFile],
                        ['file' => [
                            'required',
                            FileRule::types(config('assets.allowed_upload_mimes'))
                                ->max($this->maxAssetKilobytes()),
                        ]],
                    );

                    $asset = $this->assetService->createAsset($project, $uploadedFile, $userId);
                    $created[] = $asset;
                    $resolved[$archivePath] = $asset;

                    continue;
                }

                $matches = $project->assets()
                    ->where('original_filename', $this->originalFilename($metadata, $archivePath))
                    ->limit(2)
                    ->get();

                if ($matches->count() === 1) {
                    $resolved[$archivePath] = $matches->first();
                } else {
                    $unresolved++;
                }
            }
        } catch (Throwable $exception) {
            $this->deleteAssets($created);

            throw $exception;
        }

        return ['assets' => $resolved, 'created' => $created, 'unresolved' => $unresolved];
    }

    /**
     * @param  iterable<Asset>  $assets
     */
    public function deleteAssets(iterable $assets): void
    {
        foreach ($assets as $asset) {
            $this->assetService->deleteAsset($asset, true);
        }
    }

    protected function readZip(UploadedFile $file): PortablePackage
    {
        $zip = new ZipArchive;
        if ($zip->open($file->getRealPath()) !== true) {
            throw new RuntimeException('The uploaded package could not be opened.');
        }

        $temporaryDirectory = sys_get_temp_dir().'/elmapicms-package-'.Str::uuid();
        File::makeDirectory($temporaryDirectory, 0700, true);

        try {
            $this->validateArchiveEntries($zip);
            $manifestContents = $zip->getFromName('manifest.json');
            if (! is_string($manifestContents)) {
                throw new RuntimeException('The package is missing manifest.json.');
            }

            $manifest = $this->decodeManifest($manifestContents);
            $this->validatePortableManifest($manifest);
            $assetFiles = [];

            foreach ($this->assetDefinitions($manifest) as $archivePath => $metadata) {
                $this->assertSafeArchivePath($archivePath);
                $entry = $zip->statName($archivePath);
                if ($entry === false) {
                    throw new RuntimeException("The package asset [{$archivePath}] is missing.");
                }

                $stream = $zip->getStream($archivePath);
                if ($stream === false) {
                    throw new RuntimeException("The package asset [{$archivePath}] could not be read.");
                }

                $extension = pathinfo($this->originalFilename($metadata, $archivePath), PATHINFO_EXTENSION);
                $temporaryPath = $temporaryDirectory.'/'.Str::uuid().($extension !== '' ? '.'.$extension : '');
                $destination = fopen($temporaryPath, 'wb');
                if ($destination === false) {
                    fclose($stream);
                    throw new RuntimeException('A temporary package file could not be created.');
                }

                stream_copy_to_stream($stream, $destination);
                fclose($stream);
                fclose($destination);
                $assetFiles[$archivePath] = $temporaryPath;
            }

            return new PortablePackage($manifest, $assetFiles, $temporaryDirectory);
        } catch (Throwable $exception) {
            File::deleteDirectory($temporaryDirectory);

            throw $exception;
        } finally {
            $zip->close();
        }
    }

    protected function validateArchiveEntries(ZipArchive $zip): void
    {
        $maxFiles = (int) config('assets.portable_packages.max_files', 1000);
        $maxUncompressedSize = (int) config('assets.portable_packages.max_uncompressed_size', 2 * 1024 * 1024 * 1024);

        if ($zip->numFiles > $maxFiles) {
            throw new RuntimeException('The package contains too many files.');
        }

        $seen = [];
        $totalSize = 0;
        for ($index = 0; $index < $zip->numFiles; $index++) {
            $entry = $zip->statIndex($index);
            if ($entry === false || ! isset($entry['name'])) {
                throw new RuntimeException('The package contains an unreadable entry.');
            }

            $name = (string) $entry['name'];
            $this->assertSafeArchivePath($name);
            if (isset($seen[$name])) {
                throw new RuntimeException("The package contains duplicate entry [{$name}].");
            }

            $seen[$name] = true;
            $totalSize += (int) ($entry['size'] ?? 0);
            if ($totalSize > $maxUncompressedSize) {
                throw new RuntimeException('The uncompressed package is too large.');
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function decodeManifest(string $contents): array
    {
        $manifest = json_decode($contents, true);
        if (! is_array($manifest) || json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException('Invalid JSON package.');
        }

        return $manifest;
    }

    /**
     * @param  array<string, mixed>  $manifest
     */
    protected function validatePortableManifest(array $manifest): void
    {
        if (($manifest['format'] ?? null) !== 'elmapicms' || ($manifest['version'] ?? null) !== 1) {
            throw new RuntimeException('This package format or version is not supported.');
        }

        if (! in_array($manifest['type'] ?? null, ['project', 'collection'], true)) {
            throw new RuntimeException('The package type is invalid.');
        }
    }

    protected function assertSafeArchivePath(string $path): void
    {
        if (
            $path === ''
            || str_contains($path, "\0")
            || str_contains($path, '\\')
            || str_starts_with($path, '/')
            || preg_match('/(^|\/)\.\.?($|\/)/', $path) === 1
        ) {
            throw new RuntimeException('The package contains an unsafe file path.');
        }
    }

    /**
     * @param  array<string, mixed>  $manifest
     * @return array<string, array<string, mixed>>
     */
    protected function assetDefinitions(array $manifest): array
    {
        $assets = $manifest['assets'] ?? [];
        if (! is_array($assets)) {
            throw new RuntimeException('The package assets manifest is invalid.');
        }

        $definitions = [];
        foreach ($assets as $archivePath => $metadata) {
            if (! is_string($archivePath) || ! is_array($metadata)) {
                throw new RuntimeException('The package contains an invalid asset definition.');
            }
            $this->assertSafeArchivePath($archivePath);
            $definitions[$archivePath] = $metadata;
        }

        return $definitions;
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    protected function originalFilename(array $metadata, string $archivePath): string
    {
        $filename = $metadata['original_filename'] ?? basename($archivePath);

        return is_string($filename) && $filename !== '' ? basename($filename) : basename($archivePath);
    }

    protected function maxAssetKilobytes(): int
    {
        $configuredSize = trim((string) config('assets.max_file_size', '100M'));
        if (is_numeric($configuredSize)) {
            return max(1, (int) ceil(((float) $configuredSize) / 1024));
        }

        $value = (float) substr($configuredSize, 0, -1);

        return match (strtoupper(substr($configuredSize, -1))) {
            'G' => max(1, (int) ceil($value * 1024 * 1024)),
            'M' => max(1, (int) ceil($value * 1024)),
            'K' => max(1, (int) ceil($value)),
            default => max(1, (int) ceil($value / 1024)),
        };
    }
}
