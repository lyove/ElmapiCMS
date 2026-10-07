<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Services\ProjectLocaleService;
use Illuminate\Http\Request;

class ProjectLocaleController extends Controller
{
    public function __construct(
        private ProjectLocaleService $projectLocaleService
    ) {}

    /**
     * Add a locale to the current project.
     *
     * Route: POST /api/project/locales
     */
    public function store(Request $request): ProjectResource
    {
        $validated = $request->validate([
            'locale' => 'required|string|max:10',
        ]);

        $project = $request->attributes->get('project');
        $project = $this->projectLocaleService->addLocale($project, $validated['locale']);

        return new ProjectResource($project);
    }

    /**
     * Remove a locale from the current project (not the default).
     *
     * Route: DELETE /api/project/locales/{locale}
     */
    public function destroy(Request $request, string $locale): ProjectResource
    {
        $project = $request->attributes->get('project');
        $project = $this->projectLocaleService->removeLocale($project, $locale);

        return new ProjectResource($project);
    }

    /**
     * Set the project default locale (adds locale if missing).
     *
     * Route: PUT /api/project/locales/default
     */
    public function setDefault(Request $request): ProjectResource
    {
        $validated = $request->validate([
            'locale' => 'required|string|max:10',
        ]);

        $project = $request->attributes->get('project');
        $project = $this->projectLocaleService->setDefaultLocale($project, $validated['locale']);

        return new ProjectResource($project);
    }
}
