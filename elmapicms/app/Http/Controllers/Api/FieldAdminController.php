<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\Field;
use App\Services\RelationCollectionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FieldAdminController extends Controller
{
    /**
     * Create a new field on a collection.
     * POST /api/collections/{collection}/fields
     */
    public function store(Request $request, string $collectionSlug): JsonResponse
    {
        $this->ensureAbility('admin');

        $project = $request->attributes->get('project');
        $collection = $this->resolveCollection($project, $collectionSlug);

        if (! $collection) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $isGroup = $request->input('type') === 'group';
        if ($isGroup) {
            $request->merge(['parent_field_id' => null]);
        }

        $rules = [
            'type' => 'required|string|max:60',
            'label' => 'required|string|max:60',
            'name' => [
                'required',
                'string',
                'max:60',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('collection_fields', 'name')
                    ->where(function ($query) use ($collection, $request) {
                        $query->where('collection_id', $collection->id)
                            ->where('parent_field_id', $request->input('parent_field_id'));
                    }),
            ],
            'description' => 'nullable|string',
            'placeholder' => 'nullable|string',
            'options' => 'nullable|array',
            'validations' => 'nullable|array',
            'parent_field_id' => [
                'nullable',
                Rule::exists('collection_fields', 'id')
                    ->where(fn ($query) => $query->where('collection_id', $collection->id)
                        ->where('type', 'group')
                        ->whereNull('parent_field_id')),
            ],
        ];

        if ($isGroup) {
            $rules['options.repeatable'] = 'required|boolean';
        }

        $validated = $request->validate($rules);

        if (empty($validated['name'])) {
            $validated['name'] = Str::slug($validated['label']);
        }

        $validated['options'] = $validated['options'] ?? [];
        $relationError = RelationCollectionResolver::tryNormalizeRelationOptions($project, $validated['options'], false, false);
        if ($relationError !== null) {
            throw ValidationException::withMessages(['options.relation.collection' => [$relationError]]);
        }

        $field = DB::transaction(function () use ($validated, $project, $collection) {
            $parentFieldId = $validated['parent_field_id'] ?? null;

            $order = $parentFieldId
                ? Field::where('parent_field_id', $parentFieldId)->max('order') + 1
                : $collection->fields()->max('order') + 1;

            return Field::create([
                ...$validated,
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'order' => $order,
            ]);
        });

        return response()->json($this->transformField($field), 201);
    }

    /**
     * Update an existing field.
     * PUT /api/collections/{collection}/fields/{field}
     */
    public function update(Request $request, string $collectionSlug, string $fieldUuid): JsonResponse
    {
        $this->ensureAbility('admin');

        $project = $request->attributes->get('project');
        $collection = $this->resolveCollection($project, $collectionSlug);

        if (! $collection) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $field = Field::where('collection_id', $collection->id)
            ->where('uuid', $fieldUuid)
            ->first();

        if (! $field) {
            return response()->json(['message' => 'Field not found.'], 404);
        }

        $isGroup = $field->type === 'group';

        if ($isGroup) {
            $request->merge(['parent_field_id' => null]);
        }

        $rules = [
            'type' => 'required|string|max:60',
            'label' => 'required|string|max:60',
            'name' => [
                'required',
                'string',
                'max:60',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('collection_fields', 'name')
                    ->ignore($field->id)
                    ->where(function ($query) use ($collection, $field, $request) {
                        $parentId = $request->input('parent_field_id', $field->parent_field_id);
                        $query->where('collection_id', $collection->id)
                            ->where('parent_field_id', $parentId);
                    }),
            ],
            'description' => 'nullable|string',
            'placeholder' => 'nullable|string',
            'options' => 'nullable|array',
            'validations' => 'nullable|array',
            'parent_field_id' => [
                'nullable',
                Rule::exists('collection_fields', 'id')
                    ->where(fn ($query) => $query->where('collection_id', $collection->id)
                        ->where('type', 'group')
                        ->whereNull('parent_field_id')),
            ],
        ];

        if ($isGroup) {
            $rules['options.repeatable'] = 'required|boolean';
        }

        $validated = $request->validate($rules);

        if (empty($validated['name'])) {
            $validated['name'] = Str::slug($validated['label']);
        }

        if (array_key_exists('options', $validated)) {
            $relationError = RelationCollectionResolver::tryNormalizeRelationOptions($project, $validated['options'], false, false);
            if ($relationError !== null) {
                throw ValidationException::withMessages(['options.relation.collection' => [$relationError]]);
            }
        }

        DB::transaction(function () use ($field, $validated) {
            $parentFieldId = $validated['parent_field_id'] ?? $field->parent_field_id;

            if ($field->type === 'group') {
                $parentFieldId = null;
            }

            $field->update([
                ...$validated,
                'parent_field_id' => $parentFieldId,
            ]);
        });

        return response()->json($this->transformField($field->fresh()));
    }

    /**
     * Soft-delete a field.
     * DELETE /api/collections/{collection}/fields/{field}
     */
    public function destroy(Request $request, string $collectionSlug, string $fieldUuid): JsonResponse
    {
        $this->ensureAbility('admin');

        $project = $request->attributes->get('project');
        $collection = $this->resolveCollection($project, $collectionSlug);

        if (! $collection) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $field = Field::where('collection_id', $collection->id)
            ->where('uuid', $fieldUuid)
            ->first();

        if (! $field) {
            return response()->json(['message' => 'Field not found.'], 404);
        }

        $field->delete();

        return response()->json(null, 204);
    }

    /**
     * Reorder fields within a collection.
     * POST /api/collections/{collection}/fields/reorder
     */
    public function reorder(Request $request, string $collectionSlug): JsonResponse
    {
        $this->ensureAbility('admin');

        $project = $request->attributes->get('project');
        $collection = $this->resolveCollection($project, $collectionSlug);

        if (! $collection) {
            return response()->json(['message' => 'Collection not found.'], 404);
        }

        $validated = $request->validate([
            'fields' => 'required|array',
            'fields.*.uuid' => 'required|string',
            'fields.*.order' => 'required|integer|min:0',
        ]);

        foreach ($validated['fields'] as $item) {
            Field::where('collection_id', $collection->id)
                ->where('uuid', $item['uuid'])
                ->update(['order' => $item['order']]);
        }

        return response()->json(['message' => 'Fields reordered successfully.']);
    }

    private function ensureAbility(string $ability): void
    {
        if (auth('sanctum')->user() && auth('sanctum')->user()->tokenCan($ability)) {
            return;
        }

        abort(response()->json(['message' => 'API token doesn\'t have the right abilities!'], 403));
    }

    private function resolveCollection(mixed $project, string $slug): ?Collection
    {
        return Collection::where('project_id', $project->id)
            ->where('slug', $slug)
            ->first();
    }

    private function transformField(Field $field): array
    {
        return [
            'uuid' => $field->uuid,
            'type' => $field->type,
            'label' => $field->label,
            'name' => $field->name,
            'description' => $field->description,
            'placeholder' => $field->placeholder,
            'options' => $field->options,
            'validations' => $field->validations,
            'order' => $field->order,
            'parent_field_id' => $field->parent_field_id,
            'created_at' => $field->created_at,
            'updated_at' => $field->updated_at,
        ];
    }
}
