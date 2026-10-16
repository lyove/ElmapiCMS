<?php

declare(strict_types=1);

final class PathResolver
{
    public function __construct(
        private readonly string $publicPath,
    ) {}

    /**
     * Locate the Laravel application base path relative to the document root.
     */
    public function resolve(?string $override = null): ?string
    {
        if ($override !== null && $override !== '') {
            $path = realpath($override) ?: null;

            return $this->isLaravelRoot($path) ? $path : null;
        }

        $public = realpath($this->publicPath) ?: $this->publicPath;
        $parent = dirname($public);
        $grandparent = dirname($parent);

        $candidates = [
            // Shared hosting: public_html sibling of elmapicms/
            $parent.'/elmapicms',
            $parent.'/Elmapi3',
            $parent.'/elmapi',
            // Standard Laravel: document root is {app}/public
            $parent,
            // Nested subdomain docroot: /home/user/public_html/cms → ../../elmapicms
            $grandparent.'/elmapicms',
            $grandparent.'/Elmapi3',
        ];

        foreach ($candidates as $candidate) {
            // realpath() returns false for missing paths; normalize to null so the
            // typed isLaravelRoot(?string) check never receives false (PHP TypeError).
            $resolved = realpath($candidate) ?: null;
            if ($this->isLaravelRoot($resolved)) {
                return $resolved;
            }
        }

        return null;
    }

    public function isLaravelRoot(?string $path): bool
    {
        if ($path === null || $path === '' || ! is_dir($path)) {
            return false;
        }

        return is_file($path.'/vendor/autoload.php')
            && is_file($path.'/bootstrap/app.php')
            && is_dir($path.'/app');
    }

    /**
     * Relative path from the document root up to the app (e.g. ../elmapicms).
     */
    public function relativeFromPublic(string $basePath): string
    {
        $public = realpath($this->publicPath) ?: $this->publicPath;
        $base = realpath($basePath) ?: $basePath;

        if ($public === $base.'/public' || str_ends_with(str_replace('\\', '/', $public), '/public') && dirname($public) === $base) {
            return '..';
        }

        $publicParts = explode(DIRECTORY_SEPARATOR, $public);
        $baseParts = explode(DIRECTORY_SEPARATOR, $base);

        while ($publicParts && $baseParts && $publicParts[0] === $baseParts[0]) {
            array_shift($publicParts);
            array_shift($baseParts);
        }

        $up = str_repeat('..'.DIRECTORY_SEPARATOR, count($publicParts));
        $down = implode(DIRECTORY_SEPARATOR, $baseParts);

        $relative = rtrim($up.$down, DIRECTORY_SEPARATOR);

        return str_replace('\\', '/', $relative === '' ? '.' : $relative);
    }

    public function expectedPublicFolderName(string $basePath): string
    {
        $public = realpath($this->publicPath) ?: $this->publicPath;
        $base = realpath($basePath) ?: $basePath;

        if (dirname($public) === $base) {
            return basename($public); // usually "public"
        }

        // Sibling layout: /home/user/elmapicms + /home/user/public_html
        return basename($public);
    }

    public function needsPublicPathOverride(string $basePath): bool
    {
        $public = realpath($this->publicPath) ?: $this->publicPath;
        $expected = realpath($basePath.'/public');

        return $expected === false || $expected !== $public;
    }
}
