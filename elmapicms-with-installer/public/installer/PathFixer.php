<?php

declare(strict_types=1);

final class PathFixer
{
    public function __construct(
        private readonly PathResolver $paths,
        private readonly string $publicPath,
    ) {}

    /**
     * Adjust index.php and bootstrap/app.php for sibling document-root layouts.
     *
     * @return list<string> Human-readable actions taken
     */
    public function apply(string $basePath): array
    {
        $actions = [];

        $relative = $this->paths->relativeFromPublic($basePath);
        $indexPath = $this->publicPath.'/index.php';

        if (is_file($indexPath)) {
            $updated = $this->fixIndexPhp($indexPath, $relative);
            if ($updated) {
                $actions[] = "Updated index.php paths to use {$relative}/";
            }
        }

        if ($this->paths->needsPublicPathOverride($basePath)) {
            $publicAbsolute = realpath($this->publicPath) ?: $this->publicPath;
            $bootstrapPath = $basePath.'/bootstrap/app.php';

            if (is_file($bootstrapPath)) {
                $updated = $this->fixBootstrapApp($bootstrapPath, $publicAbsolute);
                if ($updated) {
                    $actions[] = 'Set usePublicPath() in bootstrap/app.php → '.$publicAbsolute;
                }
            }
        }

        return $actions;
    }

    private function fixIndexPhp(string $indexPath, string $relativeApp): bool
    {
        $contents = (string) file_get_contents($indexPath);
        $original = $contents;

        // Maintenance file
        $contents = preg_replace(
            "#__DIR__\s*\.\s*['\"]/../storage/framework/maintenance\.php['\"]#",
            "__DIR__.'/{$relativeApp}/storage/framework/maintenance.php'",
            $contents
        ) ?? $contents;

        // Autoload
        $contents = preg_replace(
            "#require\s+__DIR__\s*\.\s*['\"]/../vendor/autoload\.php['\"]\s*;#",
            "require __DIR__.'/{$relativeApp}/vendor/autoload.php';",
            $contents
        ) ?? $contents;

        // Bootstrap
        $contents = preg_replace(
            "#require_once\s+__DIR__\s*\.\s*['\"]/../bootstrap/app\.php['\"]#",
            "require_once __DIR__.'/{$relativeApp}/bootstrap/app.php'",
            $contents
        ) ?? $contents;

        // Already-customized sibling paths (e.g. ../Elmapi3 → ../elmapicms)
        $contents = preg_replace(
            "#require\s+__DIR__\s*\.\s*['\"]/\.\./[^'\"]+/vendor/autoload\.php['\"]\s*;#",
            "require __DIR__.'/{$relativeApp}/vendor/autoload.php';",
            $contents
        ) ?? $contents;

        $contents = preg_replace(
            "#require_once\s+__DIR__\s*\.\s*['\"]/\.\./[^'\"]+/bootstrap/app\.php['\"]#",
            "require_once __DIR__.'/{$relativeApp}/bootstrap/app.php'",
            $contents
        ) ?? $contents;

        if ($contents === $original) {
            return false;
        }

        if (file_put_contents($indexPath, $contents) === false) {
            throw new RuntimeException('Could not update index.php');
        }

        return true;
    }

    private function fixBootstrapApp(string $bootstrapPath, string $publicAbsolute): bool
    {
        $contents = (string) file_get_contents($bootstrapPath);

        if (str_contains($contents, 'usePublicPath(')) {
            // Replace existing absolute/relative argument
            $escaped = var_export($publicAbsolute, true);
            $updated = preg_replace(
                '/->usePublicPath\s*\(\s*[^)]+\s*\)/',
                '->usePublicPath('.$escaped.')',
                $contents,
                1
            );

            // Also handle $app->usePublicPath(...)
            if ($updated === null || $updated === $contents) {
                $updated = preg_replace(
                    '/\$app->usePublicPath\s*\(\s*[^)]+\s*\)\s*;/',
                    '$app->usePublicPath('.$escaped.');',
                    $contents,
                    1
                );
            }

            if ($updated !== null && $updated !== $contents) {
                if (file_put_contents($bootstrapPath, $updated) === false) {
                    throw new RuntimeException('Could not update bootstrap/app.php');
                }

                return true;
            }

            return false;
        }

        // Transform: return Application::configure(...)->create();
        // Into assigned $app + usePublicPath + return
        if (! preg_match('/return\s+Application::configure/s', $contents)) {
            throw new RuntimeException('Could not patch bootstrap/app.php: unexpected format.');
        }

        $escaped = var_export($publicAbsolute, true);

        $updated = preg_replace(
            '/return\s+(Application::configure)/',
            "\$app = $1",
            $contents,
            1
        );

        if ($updated === null) {
            throw new RuntimeException('Could not patch bootstrap/app.php');
        }

        // After ->create(); add usePublicPath and return
        $updated = preg_replace(
            '/->create\(\)\s*;/',
            "->create();\n\n\$app->usePublicPath({$escaped});\n\nreturn \$app;",
            $updated,
            1
        );

        if ($updated === null || $updated === $contents) {
            throw new RuntimeException('Could not inject usePublicPath into bootstrap/app.php');
        }

        if (file_put_contents($bootstrapPath, $updated) === false) {
            throw new RuntimeException('Could not write bootstrap/app.php');
        }

        return true;
    }
}
