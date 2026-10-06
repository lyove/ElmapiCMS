<?php

namespace App\Ai\Tools;

use App\Models\ContentEntry;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;

class NavigateTo implements Tool
{
    /**
     * The available global pages the assistant can navigate to.
     * Keys are human-readable names, values are URL paths.
     */
    public static function availablePages(): array
    {
        return [
            'dashboard' => '/',
            'app settings' => '/settings/app',
            'ai settings' => '/settings/ai',
            'profile settings' => '/settings/profile',
            'password settings' => '/settings/password',
            'appearance settings' => '/settings/appearance',
            'user management - users' => '/user-management/users',
            'user management - roles' => '/user-management/roles',
            'user management - permissions' => '/user-management/permissions',
        ];
    }

    /**
     * Project-level pages. {id} is replaced with the actual project ID.
     */
    public static function projectPages(): array
    {
        return [
            'project' => '/projects/{id}',
            'collections' => '/projects/{id}',
            'collection' => '/projects/{id}/collections/{collection_id}',
            'collection settings' => '/projects/{id}/collections/{collection_id}/edit',
            'content create' => '/projects/{id}/collections/{collection_id}/content/create',
            'content edit' => '/projects/{id}/collections/{collection_id}/content/{entry_id}/edit',
            'project settings' => '/projects/{id}/settings',
            'localization' => '/projects/{id}/settings/localization',
            'user access' => '/projects/{id}/settings/user-access',
            'api access' => '/projects/{id}/settings/api-access',
            'webhooks' => '/projects/{id}/settings/webhooks',
            'export import' => '/projects/{id}/settings/export-import',
            'assets' => '/projects/{id}/assets',
        ];
    }

    /**
     * Get the description of the tool's purpose.
     */
    public function description(): string
    {
        return 'Navigate to a known app page or a URL returned by another tool.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): string
    {
        $page = strtolower(trim((string) $request->string('page')));
        $url = trim((string) $request->string('url'));
        $projectId = trim((string) $request->string('project_id'));
        $collectionId = trim((string) $request->string('collection_id'));
        $entryId = trim((string) $request->string('entry_id'));

        // Navigate to a URL returned by another tool (e.g. search_projects)
        if ($url !== '') {
            // Ensure URL starts with / to prevent broken navigation
            if (! str_starts_with($url, '/')) {
                $url = '/'.$url;
            }

            return json_encode(['action' => 'navigate', 'url' => $url]);
        }

        // Auto-resolve collection_id from entry_id when navigating to content pages
        if ($entryId !== '' && is_numeric($entryId)) {
            $entry = ContentEntry::find((int) $entryId);
            if ($entry) {
                // Always use the entry's actual collection — overrides whatever was passed
                $collectionId = (string) $entry->collection_id;
                // Also fill project_id from the entry if not provided
                if ($projectId === '') {
                    $projectId = (string) $entry->project_id;
                }
            }
        }

        // Try project-level pages first if project_id is provided
        if ($projectId !== '') {
            $projectPages = static::projectPages();

            // Exact match
            if (isset($projectPages[$page])) {
                $resolved = str_replace(['{id}', '{collection_id}', '{entry_id}'], [$projectId, $collectionId, $entryId], $projectPages[$page]);

                return json_encode(['action' => 'navigate', 'url' => $resolved]);
            }

            // Partial match
            foreach ($projectPages as $name => $urlPath) {
                if (str_contains($name, $page) || str_contains($page, $name)) {
                    $resolved = str_replace(['{id}', '{collection_id}', '{entry_id}'], [$projectId, $collectionId, $entryId], $urlPath);

                    return json_encode(['action' => 'navigate', 'url' => $resolved]);
                }
            }
        }

        // Try global pages
        $pages = static::availablePages();

        // Exact match
        if (isset($pages[$page])) {
            return json_encode(['action' => 'navigate', 'url' => $pages[$page]]);
        }

        // Partial match
        foreach ($pages as $name => $urlPath) {
            if (str_contains($name, $page) || str_contains($page, $name)) {
                return json_encode(['action' => 'navigate', 'url' => $urlPath]);
            }
        }

        return json_encode([
            'action' => 'error',
            'message' => "Page \"{$page}\" not found. Use search_projects to find projects first.",
        ]);
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        $globalPages = implode(', ', array_keys(static::availablePages()));
        $projectPages = implode(', ', array_keys(static::projectPages()));

        return [
            'page' => $schema
                ->string()
                ->description("Page name. Global: {$globalPages}. Project (requires project_id): {$projectPages}.")
                ->required(),
            'project_id' => $schema
                ->string()
                ->description('Project ID for project-level pages. Extract from URL or tool results.'),
            'collection_id' => $schema
                ->string()
                ->description('Collection ID for collection pages. Not needed for "content edit" — it is auto-resolved from entry_id.'),
            'entry_id' => $schema
                ->string()
                ->description('Content entry ID for navigating to content edit page. The collection is auto-resolved from this.'),
            'url' => $schema
                ->string()
                ->description('URL from a tool result (e.g. from search_projects). Only use URLs returned by tools.'),
        ];
    }
}
