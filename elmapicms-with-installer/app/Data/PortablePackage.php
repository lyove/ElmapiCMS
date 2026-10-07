<?php

namespace App\Data;

use Illuminate\Support\Facades\File;

class PortablePackage
{
    /**
     * @param  array<string, mixed>  $manifest
     * @param  array<string, string>  $assetFiles
     */
    public function __construct(
        public array $manifest,
        public array $assetFiles = [],
        public ?string $temporaryDirectory = null,
    ) {}

    public function cleanup(): void
    {
        if ($this->temporaryDirectory !== null && File::isDirectory($this->temporaryDirectory)) {
            File::deleteDirectory($this->temporaryDirectory);
        }
    }
}
