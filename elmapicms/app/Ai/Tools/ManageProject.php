<?php

namespace App\Ai\Tools;

use App\Models\Project;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Arr;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;

class ManageProject implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): string
    {
        return 'Manage an existing project: add/remove locales, set default locale, get project info, or update project settings.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): string
    {
        $user = auth()->user();
        $action = trim((string) $request->string('action'));
        $projectId = (int) (string) $request->string('project_id');

        $project = Project::find($projectId);

        if (! $project) {
            return json_encode(['error' => "Project {$projectId} not found."]);
        }

        // Access check
        if (! $user->can('access_all_projects') && ! $user->projects()->where('projects.id', $project->id)->exists()) {
            return json_encode(['error' => 'You do not have access to this project.']);
        }

        return match ($action) {
            'get_info' => $this->getInfo($project),
            'add_locale' => $this->addLocale($request, $project),
            'remove_locale' => json_encode(['error' => 'Removing locales is not allowed via AI. Navigate to project localization settings to remove manually.']),
            'set_default_locale' => $this->setDefaultLocale($request, $project),
            'update' => $this->updateProject($request, $project, $user),
            default => json_encode(['error' => "Unknown action: {$action}. Available: get_info, add_locale, set_default_locale, update."]),
        };
    }

    /**
     * Return project info including locales, collections, etc.
     */
    protected function getInfo(Project $project): string
    {
        $collections = $project->collections()
            ->orderBy('order')
            ->get(['id', 'name', 'slug', 'is_singleton'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'is_singleton' => $c->is_singleton,
            ]);

        return json_encode([
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'default_locale' => $project->default_locale,
            'locales' => $project->locales,
            'public_api' => $project->public_api,
            'collections' => $collections,
            'url' => "/projects/{$project->id}",
        ]);
    }

    /**
     * Add a locale to the project.
     */
    protected function addLocale(Request $request, Project $project): string
    {
        $locale = trim((string) $request->string('locale'));

        if ($locale === '') {
            return json_encode(['error' => 'Locale code is required.']);
        }

        if (strlen($locale) > 10) {
            return json_encode(['error' => 'Locale code must be 10 characters or less.']);
        }

        $locales = Arr::wrap($project->locales);

        if (in_array($locale, $locales)) {
            return json_encode(['message' => "Locale \"{$locale}\" already exists on this project.", 'locales' => $locales]);
        }

        $locales[] = $locale;
        $project->locales = $locales;
        $project->save();

        return json_encode([
            'message' => "Locale \"{$locale}\" added.",
            'locales' => $project->locales,
            'default_locale' => $project->default_locale,
        ]);
    }

    /**
     * Remove a locale from the project.
     */
    protected function removeLocale(Request $request, Project $project): string
    {
        $locale = trim((string) $request->string('locale'));

        if ($locale === '') {
            return json_encode(['error' => 'Locale code is required.']);
        }

        if ($locale === $project->default_locale) {
            return json_encode(['error' => "Cannot remove the default locale \"{$locale}\". Change the default locale first."]);
        }

        $locales = collect(Arr::wrap($project->locales))
            ->filter(fn ($l) => $l !== $locale)
            ->values()
            ->all();

        if (count($locales) === count(Arr::wrap($project->locales))) {
            return json_encode(['message' => "Locale \"{$locale}\" was not found on this project.", 'locales' => $locales]);
        }

        $project->locales = $locales;
        $project->save();

        return json_encode([
            'message' => "Locale \"{$locale}\" removed.",
            'locales' => $project->locales,
            'default_locale' => $project->default_locale,
        ]);
    }

    /**
     * Set the default locale for the project.
     */
    protected function setDefaultLocale(Request $request, Project $project): string
    {
        $locale = trim((string) $request->string('locale'));

        if ($locale === '') {
            return json_encode(['error' => 'Locale code is required.']);
        }

        $locales = Arr::wrap($project->locales);

        // Auto-add locale if not already in the list
        if (! in_array($locale, $locales)) {
            $locales[] = $locale;
        }

        $project->locales = $locales;
        $project->default_locale = $locale;
        $project->save();

        return json_encode([
            'message' => "Default locale set to \"{$locale}\".",
            'locales' => $project->locales,
            'default_locale' => $project->default_locale,
        ]);
    }

    /**
     * Update basic project info (name, description).
     */
    protected function updateProject(Request $request, Project $project, $user): string
    {
        if (! $user->can('update_project')) {
            return json_encode(['error' => 'You do not have permission to update projects.']);
        }

        $dataJson = trim((string) $request->string('data'));

        if ($dataJson === '') {
            return json_encode(['error' => 'Data is required for update action.']);
        }

        $data = json_decode($dataJson, true);

        if (! is_array($data)) {
            return json_encode(['error' => 'Invalid JSON data.']);
        }

        $update = [];

        if (isset($data['name']) && is_string($data['name'])) {
            $name = trim($data['name']);
            if ($name === '' || strlen($name) > 255) {
                return json_encode(['error' => 'Name must be between 1 and 255 characters.']);
            }
            $update['name'] = $name;
        }

        if (isset($data['description'])) {
            $update['description'] = is_string($data['description']) ? trim($data['description']) : null;
        }

        if (empty($update)) {
            return json_encode(['error' => 'Nothing to update.']);
        }

        $project->update($update);

        return json_encode([
            'message' => 'Project updated.',
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
        ]);
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'action' => $schema
                ->string()
                ->description('Action: get_info, add_locale, set_default_locale, update')
                ->required(),
            'project_id' => $schema
                ->integer()
                ->description('Target project ID')
                ->required(),
            'locale' => $schema
                ->string()
                ->description('Locale code (e.g. "en", "tr", "de", "fr"). Used by add_locale, remove_locale, set_default_locale.'),
            'data' => $schema
                ->string()
                ->description('JSON data for update action: {"name":"...","description":"..."}'),
        ];
    }
}
