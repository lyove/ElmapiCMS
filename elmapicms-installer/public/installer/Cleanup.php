<?php

declare(strict_types=1);

final class Cleanup
{
    public function __construct(
        private readonly string $publicPath,
        private readonly string $installerDir,
    ) {}

    /**
     * Remove install.php and the installer/ directory from the document root.
     *
     * @return list<string>
     */
    public function removeInstallerFiles(): array
    {
        $removed = [];
        $errors = [];

        $installPhp = $this->publicPath.'/install.php';
        if (is_file($installPhp)) {
            if (@unlink($installPhp)) {
                $removed[] = 'install.php';
            } else {
                $errors[] = 'install.php';
            }
        }

        if (is_dir($this->installerDir)) {
            if (installer_delete_path($this->installerDir)) {
                $removed[] = 'installer/';
            } else {
                $errors[] = 'installer/';
            }
        }

        if ($errors !== []) {
            throw new RuntimeException(
                'Could not delete: '.implode(', ', $errors).'. Remove them manually from the document root.'
            );
        }

        return $removed;
    }
}
