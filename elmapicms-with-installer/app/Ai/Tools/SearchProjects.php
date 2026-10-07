<?php

namespace App\Ai\Tools;

use App\Models\Project;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;

class SearchProjects implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): string
    {
        return 'Search, list, or count projects. Set navigate=true to open the project directly.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): string
    {
        $query = strtolower(trim((string) $request->string('query')));
        $navigate = (bool) $request->boolean('navigate');
        $user = auth()->user();

        // Base query with access control
        $baseQuery = Project::query()
            ->when(! $user->can('access_all_projects'), fn ($q) => $q->whereIn('id', $user->projects()->pluck('projects.id')));

        // Count all projects
        if ($query === 'count') {
            return json_encode(['total' => $baseQuery->count()]);
        }

        // Latest project
        if ($query === 'latest') {
            $project = $baseQuery->latest()->first(['id', 'name', 'created_at']);
            if (! $project) {
                return json_encode(['message' => 'No projects found.']);
            }

            $result = [
                'name' => $project->name,
                'url' => "/projects/{$project->id}",
                'created' => $project->created_at->diffForHumans(),
            ];

            if ($navigate) {
                $result['action'] = 'navigate';
            }

            return json_encode($result);
        }

        // List all (limited)
        if (in_array($query, ['list', 'all', ''])) {
            $total = $baseQuery->count();
            $projects = (clone $baseQuery)->latest()->limit(15)->get(['id', 'name']);
            if ($projects->isEmpty()) {
                return json_encode(['message' => 'No projects found.', 'total' => 0]);
            }

            return json_encode([
                'total' => $total,
                'projects' => $projects->map(fn ($p) => [
                    'name' => $p->name,
                    'url' => "/projects/{$p->id}",
                ])->values(),
            ]);
        }

        // Search by name (escape LIKE wildcards so _ and % are treated literally)
        $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $query);
        $results = (clone $baseQuery)->where('name', 'like', "%{$escaped}%")
            ->latest()
            ->get(['id', 'name']);

        if ($results->isEmpty()) {
            return json_encode(['message' => "No projects matching \"{$query}\".", 'total' => 0]);
        }

        // Navigate to first (latest) result when requested
        if ($navigate) {
            $p = $results->first();

            return json_encode([
                'action' => 'navigate',
                'url' => "/projects/{$p->id}",
                'name' => $p->name,
                'total' => $results->count(),
            ]);
        }

        return json_encode([
            'total' => $results->count(),
            'projects' => $results->map(fn ($p) => [
                'name' => $p->name,
                'url' => "/projects/{$p->id}",
            ])->values(),
        ]);
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'query' => $schema
                ->string()
                ->description('Project name to search, or: count, latest, list')
                ->required(),
            'navigate' => $schema
                ->boolean()
                ->description('Set true to navigate to the project (only works for single match or latest)'),
        ];
    }
}
