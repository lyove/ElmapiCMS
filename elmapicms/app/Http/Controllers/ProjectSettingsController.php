<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExportCollectionPackageRequest;
use App\Http\Requests\ExportProjectPackageRequest;
use App\Models\Collection;
use App\Models\Project;
use App\Services\ExportPackageService;
use App\Services\ProjectExportService;
use App\Services\ProjectLocaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProjectSettingsController extends Controller
{
    public function __construct(
        private ProjectLocaleService $projectLocaleService,
        private ExportPackageService $exportPackageService,
    ) {}

    /**
     * Show main project settings page.
     */
    public function project(Project $project)
    {
        return Inertia::render('admin/Projects/Settings/Project', [
            'project' => $project,
        ]);
    }

    /**
     * Placeholder for localization settings.
     */
    public function localization(Project $project)
    {
        return Inertia::render('admin/Projects/Settings/Localization', [
            'project' => $project,
        ]);
    }

    /**
     * Placeholder for users & roles settings.
     */
    public function userAccess(Project $project)
    {
        $project->load(['members.roles']);

        return Inertia::render('admin/Projects/Settings/UserAccess', [
            'project' => $project,
        ]);
    }

    /**
     * Placeholder for API access settings.
     */
    public function apiAccess(Project $project)
    {
        return Inertia::render('admin/Projects/Settings/APIAccess', [
            'project' => $project,
            'tokens' => $project->tokens()->select('id', 'name', 'abilities', 'last_used_at', 'created_at')->orderBy('created_at', 'desc')->get(),
        ]);
    }

    /**
     * Placeholder for webhooks settings.
     */
    public function webhooks(Project $project)
    {
        $project->load(['collections:id,project_id,name']);

        return Inertia::render('admin/Projects/Settings/Webhooks', [
            'project' => $project,
        ]);
    }

    /* ------------------------ Locale management APIs --------------------- */

    public function addLocale(Request $request, Project $project)
    {
        $validated = $request->validate([
            'locale' => 'required|string|max:10',
        ]);

        try {
            $project = $this->projectLocaleService->addLocale($project, $validated['locale']);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->errors()['locale'][0] ?? $e->getMessage(),
            ], 422);
        }

        return response()->json($project);
    }

    public function deleteLocale(Project $project, string $locale)
    {
        try {
            $project = $this->projectLocaleService->removeLocale($project, $locale);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->errors()['locale'][0] ?? $e->getMessage(),
            ], 422);
        }

        return response()->json($project);
    }

    public function setDefaultLocale(Request $request, Project $project)
    {
        $validated = $request->validate([
            'locale' => 'required|string|max:10',
        ]);

        try {
            $project = $this->projectLocaleService->setDefaultLocale($project, $validated['locale']);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->errors()['locale'][0] ?? $e->getMessage(),
            ], 422);
        }

        return response()->json($project);
    }

    /* ------------------------ Member management --------------------- */

    public function addMember(Request $request, Project $project)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $project->members()->syncWithoutDetaching([$validated['user_id']]);

        return response()->json($project->load('members.roles'));
    }

    public function removeMember(Project $project, $userId)
    {
        $project->members()->detach($userId);

        return response()->json($project->load('members.roles'));
    }

    /* ------------------ API Token management ------------------ */

    public function createToken(Request $request, Project $project)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'abilities' => 'required|array|min:1',
        ]);

        $token = $project->createToken($validated['name'], $validated['abilities']);

        return response()->json([
            'token' => Str::after($token->plainTextToken, '|'),
            'token_id' => $token->accessToken->id,
        ]);
    }

    public function updateToken(Request $request, Project $project, $tokenId)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'abilities' => 'required|array|min:1',
        ]);

        $token = $project->tokens()->findOrFail($tokenId);
        $token->name = $validated['name'];
        $token->abilities = $validated['abilities'];
        $token->save();

        return response()->json(['message' => 'Token updated.']);
    }

    public function deleteToken(Project $project, $tokenId)
    {
        $project->tokens()->where('id', $tokenId)->delete();

        return response()->json(['message' => 'Token deleted.']);
    }

    public function togglePublicApi(Project $project)
    {
        $project->public_api = ! $project->public_api;
        $project->save();

        return response()->json(['public_api' => $project->public_api]);
    }

    /**
     * Show export/import settings page.
     */
    public function exportImport(Project $project)
    {
        $project->load(['collections:id,project_id,name,slug']);

        return Inertia::render('admin/Projects/Settings/ExportImport', [
            'project' => $project,
        ]);
    }

    /**
     * Export project structure to JSON.
     */
    public function exportProject(
        ExportProjectPackageRequest $request,
        Project $project
    ): JsonResponse|BinaryFileResponse {
        $validated = $request->validated();
        $includeCollections = $validated['include_collections'] ?? true;
        $includeContent = $validated['include_content'] ?? false;
        $assetScope = $validated['asset_scope'] ?? 'none';

        $exportData = ProjectExportService::export(
            $project,
            $includeCollections,
            $includeContent,
            $assetScope
        );

        $safeName = Str::slug($project->name) ?: 'project-'.$project->id;
        $filename = 'project_'.$safeName.'_'.date('Y-m-d');

        if ($assetScope === 'none') {
            return response()->json($exportData)
                ->header('Content-Type', 'application/json')
                ->header('Content-Disposition', 'attachment; filename="'.$filename.'.json"');
        }

        $zipPath = $this->exportPackageService->buildZip($project, $exportData);

        return response()
            ->download($zipPath, $filename.'.zip', ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend(true);
    }

    /**
     * Export collection structure to JSON.
     */
    public function exportCollection(
        ExportCollectionPackageRequest $request,
        Project $project,
        Collection $collection
    ): JsonResponse|BinaryFileResponse {
        if ($collection->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validated();
        $includeContent = $validated['include_content'] ?? false;
        $assetScope = $validated['asset_scope'] ?? 'none';
        $exportData = ProjectExportService::exportCollection($collection, $includeContent, $assetScope);
        $filename = 'collection_'.$collection->slug.'_'.date('Y-m-d');

        if ($assetScope === 'none') {
            return response()->json($exportData)
                ->header('Content-Type', 'application/json')
                ->header('Content-Disposition', 'attachment; filename="'.$filename.'.json"');
        }

        $zipPath = $this->exportPackageService->buildZip($project, $exportData);

        return response()
            ->download($zipPath, $filename.'.zip', ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend(true);
    }
}
