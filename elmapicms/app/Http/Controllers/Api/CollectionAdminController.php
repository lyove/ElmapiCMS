<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectionResource;
use App\Models\Collection;
use App\Models\Field;
use App\Models\Project;
use App\Services\RelationCollectionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CollectionAdminController extends Controller
{
    /**
     * Create a new collection.
     * POST /api/collections
     */
    public function store(Request $request): JsonResponse|CollectionResource
    {
        $this->ensureAbility('admin');

        $project = $request->attributes->get('project');

        $validated = $request->validate([
            'name' => 'required|string|max:60',
            'slug' => [
                'required',
                'string',
                'max:60',
                Rule::notIn(['collections', 'files', 'webhooks']),
                'unique:collections,slug,NULL,id,project_id,'.$project->id,
            ],
            'is_singleton' => 'sometimes|boolean',
            'fields' => 'nullable|array',
            'fields.*.type' => 'required_with:fields|string|max:60',
            'fields.*.label' => 'required_with:fields|string|max:60',
            'fields.*.name' => 'required_with:fields|string|max:60|regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            'fields.*.description' => 'nullable|string',
            'fields.*.placeholder' => 'nullable|string',
            'fields.*.options' => 'nullable|array',
            'fields.*.validations' => 'nullable|array',
            'fields.*.children' => 'nullable|array',
            'fields.*.children.*.type' => 'required_with:fields.*.children|string|max:60',
            'fields.*.children.*.label' => 'required_with:fields.*.children|string|max:60',
            'fields.*.children.*.name' => 'required_with:fields.*.children|string|max:60|regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            'fields.*.children.*.description' => 'nullable|string',
            'fields.*.children.*.placeholder' => 'nullable|string',
            'fields.*.children.*.options' => 'nullable|array',
            'fields.*.children.*.validations' => 'nullable|array',
        ]);

        $collection = DB::transaction(function () use ($validated, $project) {
            $collection = $project->collections()->create([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'is_singleton' => $validated['is_singleton'] ?? false,
            ]);

            $collection->order = $collection->id;
            $collection->save();

            // Create fields if provided
            if (! empty($validated['fields'])) {
                $this->createFields($validated['fields'], $project, $collection);
            }

            return $collection;
        });

        $collection->load('fields.children');

        return (new CollectionResource($collection))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update an existing collection.
     * PUT /api/collections/{collection}
     */
    public function update(Request $request, string $collection): JsonResponse|CollectionResource
    {
        $this->ensureAbility('admin');

        $project = $request->attributes->get('project');

        $collection = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (! $collection) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:60',
            'slug' => [
                'required',
                'string',
                'max:60',
                Rule::notIn(['collections', 'files', 'webhooks']),
                'unique:collections,slug,'.$collection->id.',id,project_id,'.$project->id,
            ],
        ]);

        $previousSlug = $collection->slug;

        $collection->update([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
        ]);

        if ($validated['slug'] !== $previousSlug) {
            RelationCollectionResolver::rewriteRelationOptionsReferencingCollectionSlug(
                $project,
                $previousSlug,
                $collection->fresh(),
            );
        }

        return new CollectionResource($collection->fresh());
    }

    /**
     * Delete a collection and all its data.
     * DELETE /api/collections/{collection}
     */
    public function destroy(Request $request, string $collection): JsonResponse
    {
        $this->ensureAbility('admin');

        $project = $request->attributes->get('project');

        $collection = Collection::where('project_id', $project->id)
            ->where('slug', $collection)
            ->first();

        if (! $collection) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $request->validate([
            'slug' => ['required', 'string', function ($attribute, $value, $fail) use ($collection) {
                if ($value !== $collection->slug) {
                    $fail('The collection slug does not match.');
                }
            }],
        ]);

        $collection->contentEntries()->forceDelete();
        $collection->allFields()->forceDelete();
        $collection->forceDelete();

        return response()->json(null, 204);
    }

    /**
     * Reorder collections within a project.
     * POST /api/collections/reorder
     */
    public function reorder(Request $request): JsonResponse
    {
        $this->ensureAbility('admin');

        $project = $request->attributes->get('project');

        $validated = $request->validate([
            'collections' => 'required|array',
            'collections.*.uuid' => 'required|string',
            'collections.*.order' => 'required|integer|min:0',
        ]);

        foreach ($validated['collections'] as $item) {
            $collection = $project->collections()->where('uuid', $item['uuid'])->first();
            if ($collection) {
                $collection->update(['order' => $item['order']]);
            }
        }

        return response()->json(['message' => 'Collections reordered successfully.']);
    }

    /**
     * Create fields (and child fields for groups) on a collection.
     *
     * @param  array<int, array<string, mixed>>  $fields
     */
    private function createFields(array $fields, Project $project, Collection $collection): void
    {
        foreach ($fields as $order => $fieldData) {
            $options = $fieldData['options'] ?? [];
            $relationError = RelationCollectionResolver::tryNormalizeRelationOptions($project, $options, false, false);
            if ($relationError !== null) {
                throw ValidationException::withMessages([
                    "fields.{$order}.options.relation.collection" => [$relationError],
                ]);
            }

            $field = Field::create([
                'type' => $fieldData['type'],
                'label' => $fieldData['label'],
                'name' => $fieldData['name'] ?: Str::slug($fieldData['label']),
                'description' => $fieldData['description'] ?? null,
                'placeholder' => $fieldData['placeholder'] ?? null,
                'options' => $options,
                'validations' => $fieldData['validations'] ?? [],
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'order' => $order + 1,
            ]);

            // If group field, create children
            if ($fieldData['type'] === 'group' && ! empty($fieldData['children'])) {
                foreach ($fieldData['children'] as $childOrder => $childData) {
                    $childOptions = $childData['options'] ?? [];
                    $childRelationError = RelationCollectionResolver::tryNormalizeRelationOptions($project, $childOptions, false, false);
                    if ($childRelationError !== null) {
                        throw ValidationException::withMessages([
                            "fields.{$order}.children.{$childOrder}.options.relation.collection" => [$childRelationError],
                        ]);
                    }

                    Field::create([
                        'type' => $childData['type'],
                        'label' => $childData['label'],
                        'name' => $childData['name'] ?: Str::slug($childData['label']),
                        'description' => $childData['description'] ?? null,
                        'placeholder' => $childData['placeholder'] ?? null,
                        'options' => $childOptions,
                        'validations' => $childData['validations'] ?? [],
                        'project_id' => $project->id,
                        'collection_id' => $collection->id,
                        'parent_field_id' => $field->id,
                        'order' => $childOrder + 1,
                    ]);
                }
            }
        }
    }

    private function ensureAbility(string $ability): void
    {
        if (auth('sanctum')->user() && auth('sanctum')->user()->tokenCan($ability)) {
            return;
        }

        abort(response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403));
    }
}
