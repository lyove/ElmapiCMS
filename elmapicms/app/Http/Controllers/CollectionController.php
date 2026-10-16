<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportCollectionPackageRequest;
use App\Models\Asset;
use App\Models\Collection;
use App\Models\CollectionTemplate;
use App\Models\ContentEntry;
use App\Models\ContentFieldGroup;
use App\Models\Field;
use App\Models\Project;
use App\Services\ContentEntryVersioningService;
use App\Services\PortablePackageService;
use App\Services\RelationCollectionResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Throwable;

class CollectionController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, Project $project)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:60',
            'slug' => [
                'required',
                'string',
                'max:60',
                Rule::notIn(['collections', 'files']),
                'unique:collections,slug,NULL,id,project_id,'.$project->id,
            ],
            'template_id' => 'nullable|integer|exists:collection_templates,id',
            'is_singleton' => 'sometimes|boolean',
        ]);

        $collection = $project->collections()->create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'is_singleton' => $validated['is_singleton'] ?? false,
        ]);

        $collection->order = $collection->id;
        $collection->save();

        if (! empty($validated['template_id'])) {
            $template = CollectionTemplate::with('fields')->find($validated['template_id']);

            if ($template) {
                foreach ($template->fields as $field) {
                    $collection->fields()->create([
                        'type' => $field->type,
                        'label' => $field->label,
                        'name' => $field->name,
                        'description' => $field->description,
                        'placeholder' => $field->placeholder,
                        'options' => $field->options,
                        'validations' => $field->validations,
                        'project_id' => $project->id,
                        'order' => $field->order,
                    ]);
                }
            }
        }

        return redirect()->route('projects.collections.show', [$project, $collection])
            ->with('success', 'Collection created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project, Collection $collection)
    {
        if ($collection->project_id !== $project->id) {
            abort(404);
        }

        // For singleton collections, if an entry already exists, redirect straight to its edit page
        if ($collection->is_singleton) {
            $defaultLocale = $project->default_locale;
            $existingEntry = $defaultLocale
                ? $collection->contentEntries()->where('locale', $defaultLocale)->first()
                : null;
            if (! $existingEntry) {
                $existingEntry = $collection->contentEntries()->latest('updated_at')->first();
            }
            if ($existingEntry) {
                return redirect()->route('projects.collections.content.edit', [
                    'project' => $project->id,
                    'collection' => $collection->id,
                    'contentEntry' => $existingEntry->id,
                ]);
            } else {
                return redirect()->route('projects.collections.content.create', [
                    'project' => $project->id,
                    'collection' => $collection->id,
                ]);
            }
        }

        $collection->load('fields.children');

        // Transform fields to flat list (parent and child fields)
        $allFields = collect();
        foreach ($collection->fields as $field) {
            $allFields->push($this->transformField($field, $project));
            if ($field->children) {
                foreach ($field->children as $child) {
                    $allFields->push($this->transformField($child, $project));
                }
            }
        }

        $collectionData = $collection->toArray();
        $collectionData['fields'] = $allFields->values()->toArray();

        return Inertia::render('admin/Collections/Show', [
            'project' => $project->load('collections'),
            'collection' => $collectionData,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Project $project, Collection $collection)
    {
        if ($collection->project_id !== $project->id) {
            abort(404);
        }

        $collection->load('fields.children');

        // Transform fields to flat list (parent and child fields)
        $allFields = collect();
        foreach ($collection->fields as $field) {
            $allFields->push($this->transformField($field, $project));
            if ($field->children) {
                foreach ($field->children as $child) {
                    $allFields->push($this->transformField($child, $project));
                }
            }
        }

        $collectionData = $collection->toArray();
        $collectionData['fields'] = $allFields->values()->toArray();

        return Inertia::render('admin/Collections/Edit', [
            'project' => $project->load('collections'),
            'collection' => $collectionData,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project, Collection $collection)
    {
        if ($collection->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:60',
            'slug' => [
                'required',
                'string',
                'max:60',
                Rule::notIn(['collections', 'files']),
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

        return back()->with('success', 'Collection updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Project $project, Collection $collection)
    {
        if ($collection->project_id !== $project->id) {
            abort(404);
        }

        $request->validate([
            'slug' => ['required', 'string', function ($attribute, $value, $fail) use ($collection) {
                if ($value !== $collection->slug) {
                    $fail('The collection slug does not match.');
                }
            }],
        ]);

        $collection->contentEntries()->forceDelete();
        $collection->fields()->forceDelete();
        $collection->forceDelete();

        return redirect()->route('projects.show', $project)
            ->with('success', 'Collection deleted successfully.');
    }

    /**
     * Reorder collections within a project.
     */
    public function reorder(Request $request, Project $project)
    {
        $validated = $request->validate([
            'collections' => 'required|array',
            'collections.*.id' => 'required|exists:collections,id',
            'collections.*.order' => 'required|integer|min:0',
        ]);

        foreach ($validated['collections'] as $item) {
            $collection = $project->collections()->find($item['id']);
            if ($collection) {
                $collection->update(['order' => $item['order']]);
            }
        }

        return response()->json(['message' => 'Collections reordered successfully']);
    }

    /**
     * Import collection from JSON file
     */
    public function import(
        ImportCollectionPackageRequest $request,
        Project $project,
        PortablePackageService $packageService,
    ): RedirectResponse {
        $validated = $request->validated();

        try {
            $package = $packageService->read($request->file('import_file'));
        } catch (Throwable $exception) {
            throw ValidationException::withMessages(['import_file' => $exception->getMessage()]);
        }

        $collectionData = $package->manifest;
        if (isset($collectionData['type']) && $collectionData['type'] !== 'collection') {
            $package->cleanup();
            throw ValidationException::withMessages(['import_file' => 'Please select a collection package.']);
        }

        if (empty($collectionData['fields']) || ! is_array($collectionData['fields'])) {
            $package->cleanup();
            throw ValidationException::withMessages(['import_file' => 'Invalid collection structure. Missing fields.']);
        }

        $name = $validated['name'] ?? $collectionData['name'] ?? null;
        $slug = $validated['slug'] ?? $collectionData['slug'] ?? null;
        $collectionValidator = Validator::make(
            ['name' => $name, 'slug' => $slug],
            [
                'name' => ['required', 'string', 'max:60'],
                'slug' => [
                    'required',
                    'string',
                    'max:60',
                    Rule::notIn(['collections', 'files']),
                    Rule::unique('collections', 'slug')->where('project_id', $project->id),
                ],
            ],
        );
        if ($collectionValidator->fails()) {
            $package->cleanup();
            throw new ValidationException($collectionValidator);
        }

        $createdAssets = [];
        DB::beginTransaction();

        try {
            $assetResolution = $packageService->resolveAssets($project, $package, auth()->id());
            $createdAssets = $assetResolution['created'];

            $collection = $project->collections()->create([
                'name' => $name,
                'slug' => $slug,
                'is_singleton' => $validated['is_singleton'] ?? $collectionData['is_singleton'] ?? false,
            ]);

            $collection->order = $collection->id;
            $collection->save();

            // Get existing collections for relation field mapping
            $project->load(['collections']);
            $collectionSlugById = $project->collections->pluck('slug', 'id');

            // Create fields
            if (! empty($collectionData['fields']) && is_array($collectionData['fields'])) {
                foreach ($collectionData['fields'] as $fieldIdx => $fieldData) {
                    $opts = $fieldData['options'] ?? [];
                    RelationCollectionResolver::tryNormalizeRelationOptions($project, $opts, false, true);

                    $field = $collection->fields()->create([
                        'type' => $fieldData['type'],
                        'label' => $fieldData['label'],
                        'name' => $fieldData['name'],
                        'description' => $fieldData['description'] ?? null,
                        'placeholder' => $fieldData['placeholder'] ?? null,
                        'options' => $opts,
                        'validations' => $fieldData['validations'] ?? [],
                        'project_id' => $project->id,
                        'order' => $fieldIdx + 1,
                    ]);

                    // Handle group field children
                    if ($fieldData['type'] === 'group' && ! empty($fieldData['children']) && is_array($fieldData['children'])) {
                        foreach ($fieldData['children'] as $childIdx => $childData) {
                            $childOpts = $childData['options'] ?? [];
                            RelationCollectionResolver::tryNormalizeRelationOptions($project, $childOpts, false, true);

                            $collection->fields()->create([
                                'type' => $childData['type'],
                                'label' => $childData['label'],
                                'name' => $childData['name'],
                                'description' => $childData['description'] ?? null,
                                'placeholder' => $childData['placeholder'] ?? null,
                                'options' => $childOpts,
                                'validations' => $childData['validations'] ?? [],
                                'project_id' => $project->id,
                                'parent_field_id' => $field->id,
                                'order' => $childIdx + 1,
                            ]);
                        }
                    }
                }
            }

            // Import content if available
            if (! empty($collectionData['demo_data']) && is_array($collectionData['demo_data'])) {
                // Reload fields to get all fields including children
                $collection->load('allFields');
                $fieldMap = $collection->allFields()->get()->keyBy('name');

                DB::transaction(function () use ($collectionData, $collection, $project, $fieldMap, $assetResolution) {
                    $pendingRelations = [];
                    $tempIdToEntryId = [];
                    $publishedEntryIds = [];

                    foreach ($collectionData['demo_data'] as $demoGroup) {
                        // When importing a single collection file, import all entries
                        // The slug in demo_data is just metadata from export, we import all entries
                        $entries = $demoGroup['entries'] ?? [];
                        if (empty($entries)) {
                            continue;
                        }

                        foreach ($entries as $entryData) {
                            $state = $entryData['state'] ?? 'draft';
                            if (! in_array($state, ['draft', 'published'], true)) {
                                $state = 'draft';
                            }

                            $entry = $collection->contentEntries()->create([
                                'project_id' => $project->id,
                                'locale' => $entryData['locale'] ?? $project->default_locale,
                                'state' => $state,
                                'translation_group_id' => $entryData['translation_group_id'] ?? null,
                                'created_by' => auth()->id(),
                                'updated_by' => auth()->id(),
                                'published_at' => $state === 'published' ? now() : null,
                            ]);

                            if (isset($entryData['id'])) {
                                $tempIdToEntryId[$entryData['id']] = $entry->id;
                            }

                            if ($state === 'published') {
                                $publishedEntryIds[] = $entry->id;
                            }

                            foreach ($entryData['fields'] as $fieldName => $value) {
                                if (! $fieldMap->has($fieldName)) {
                                    continue;
                                }

                                $field = $fieldMap[$fieldName];

                                if ($field->type === 'group') {
                                    $this->saveFieldGroupFromImport(
                                        $entry,
                                        $field,
                                        $value,
                                        $project,
                                        $collection,
                                        $assetResolution['assets'],
                                    );
                                } elseif ($field->type === 'relation') {
                                    $identifiers = $value;

                                    $fv = $entry->fieldValues()->create([
                                        'project_id' => $project->id,
                                        'collection_id' => $collection->id,
                                        'field_id' => $field->id,
                                        'field_type' => $field->type,
                                        'json_value' => $identifiers,
                                    ]);

                                    $pendingRelations[] = [
                                        'fieldValue' => $fv,
                                        'identifiers' => $identifiers,
                                    ];
                                } elseif ($field->type === 'media') {
                                    $this->saveMediaFieldValue(
                                        $entry,
                                        $field,
                                        $value,
                                        $project,
                                        $collection,
                                        $assetResolution['assets'],
                                    );
                                } else {
                                    $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];

                                    if ($isRepeatable && is_array($value)) {
                                        foreach ($value as $item) {
                                            $column = $this->columnFor($field->type);
                                            $entry->fieldValues()->create([
                                                'project_id' => $project->id,
                                                'collection_id' => $collection->id,
                                                'field_id' => $field->id,
                                                'field_type' => $field->type,
                                                $column => $item,
                                            ]);
                                        }
                                    } else {
                                        $column = $this->columnFor($field->type);
                                        $entry->fieldValues()->create([
                                            'project_id' => $project->id,
                                            'collection_id' => $collection->id,
                                            'field_id' => $field->id,
                                            'field_type' => $field->type,
                                            $column => $value,
                                        ]);
                                    }
                                }
                            }
                        }
                    }

                    // Resolve relations (only for entries within this collection)
                    foreach ($pendingRelations as $rel) {
                        $fieldValue = $rel['fieldValue'];
                        $identifiers = is_array($rel['identifiers']) ? $rel['identifiers'] : [$rel['identifiers']];

                        $resolvedIds = [];
                        foreach ($identifiers as $identifier) {
                            if (empty($identifier)) {
                                continue;
                            }
                            // Only resolve if the related entry exists in our tempIdToEntryId map
                            // (i.e., it's from the same collection being imported)
                            if (isset($tempIdToEntryId[$identifier])) {
                                $resolvedIds[] = $tempIdToEntryId[$identifier];
                            }
                        }

                        if (! empty($resolvedIds)) {
                            $resolvedIds = array_values(array_unique($resolvedIds));
                            $fieldValue->json_value = $resolvedIds;
                            $fieldValue->save();

                            foreach ($resolvedIds as $idx => $relId) {
                                $fieldValue->valueRelations()->create([
                                    'related_id' => $relId,
                                    'related_type' => ContentEntry::class,
                                    'sort_order' => $idx,
                                ]);
                            }
                        } else {
                            // No valid relations found, clear the field value
                            $fieldValue->json_value = [];
                            $fieldValue->save();
                        }
                    }

                    app(ContentEntryVersioningService::class)->publishEntriesMissingVersion($publishedEntryIds, auth()->id());
                });
            }

            DB::commit();
        } catch (Throwable $exception) {
            DB::rollBack();
            $packageService->deleteAssets($createdAssets);

            throw $exception;
        } finally {
            $package->cleanup();
        }

        $response = redirect()->route('projects.collections.show', [$project, $collection])
            ->with('success', 'Collection imported successfully.');
        if ($assetResolution['unresolved'] > 0) {
            $response->with('warning', "{$assetResolution['unresolved']} asset(s) could not be matched and were left empty.");
        }

        return $response;
    }

    /**
     * Save field group from import data
     */
    /**
     * @param  array<string, Asset>  $assetsByReference
     */
    protected function saveFieldGroupFromImport(
        ContentEntry $contentEntry,
        Field $field,
        mixed $value,
        Project $project,
        Collection $collection,
        array $assetsByReference = [],
    ): void {
        // Load child fields if not already loaded
        if (! $field->relationLoaded('children')) {
            $field->load('children');
        }

        $childFields = $field->children()->orderBy('order')->get();

        if ($childFields->isEmpty()) {
            return;
        }

        $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];

        // Normalize value to array format
        if ($isRepeatable) {
            $groupInstances = is_array($value) ? $value : [];
        } else {
            $groupInstances = is_array($value) && isset($value[0]) ? $value : ($value ? [$value] : []);
        }

        foreach ($groupInstances as $sortOrder => $instanceData) {
            if (! is_array($instanceData)) {
                continue;
            }

            $groupInstance = ContentFieldGroup::create([
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'content_entry_id' => $contentEntry->id,
                'field_id' => $field->id,
                'sort_order' => $sortOrder,
            ]);

            foreach ($childFields as $childField) {
                $childValue = $instanceData[$childField->name] ?? null;

                if ($childValue !== null && $childField->type === 'media') {
                    $this->saveMediaFieldValue(
                        $contentEntry,
                        $childField,
                        $childValue,
                        $project,
                        $collection,
                        $assetsByReference,
                        $groupInstance->id,
                    );
                } elseif ($childValue !== null) {
                    $column = $this->columnFor($childField->type);
                    $contentEntry->fieldValues()->create([
                        'project_id' => $project->id,
                        'collection_id' => $collection->id,
                        'field_id' => $childField->id,
                        'field_type' => $childField->type,
                        'group_instance_id' => $groupInstance->id,
                        $column => $childValue,
                    ]);
                }
            }
        }
    }

    /**
     * @param  array<string, Asset>  $assetsByReference
     */
    protected function saveMediaFieldValue(
        ContentEntry $contentEntry,
        Field $field,
        mixed $value,
        Project $project,
        Collection $collection,
        array $assetsByReference,
        ?int $groupInstanceId = null,
    ): void {
        $assets = collect($this->mediaReferences($value))
            ->map(fn (string $reference) => $assetsByReference[$reference] ?? null)
            ->filter(fn (?Asset $asset) => $asset?->project_id === $project->id)
            ->unique('id')
            ->values();

        $fieldValue = $contentEntry->fieldValues()->create([
            'project_id' => $project->id,
            'collection_id' => $collection->id,
            'field_id' => $field->id,
            'field_type' => $field->type,
            'group_instance_id' => $groupInstanceId,
            'json_value' => $assets->pluck('id')->all(),
        ]);

        foreach ($assets as $sortOrder => $asset) {
            $fieldValue->mediaRelations()->create([
                'asset_id' => $asset->id,
                'sort_order' => $sortOrder,
            ]);
        }
    }

    /**
     * @return array<int, string>
     */
    protected function mediaReferences(mixed $value): array
    {
        if (is_string($value)) {
            return [$value];
        }

        if (! is_array($value)) {
            return [];
        }

        if (isset($value['path']) && is_string($value['path'])) {
            return [$value['path']];
        }

        return collect($value)
            ->flatMap(fn (mixed $item) => $this->mediaReferences($item))
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Map a field type to the corresponding column in content_field_values table.
     */
    protected function columnFor(string $type): string
    {
        return match ($type) {
            'number' => 'number_value',
            'boolean' => 'boolean_value',
            'date' => 'date_value',
            'datetime' => 'datetime_value',
            'json', 'enumeration', 'relation', 'media' => 'json_value',
            default => 'text_value',
        };
    }

    /**
     * Transform a field to array format
     */
    protected function transformField(Field $field, Project $project): array
    {
        return [
            'id' => $field->id,
            'uuid' => $field->uuid,
            'type' => $field->type,
            'label' => $field->label,
            'name' => $field->name,
            'description' => $field->description,
            'placeholder' => $field->placeholder,
            'options' => RelationCollectionResolver::optionsWithResolvedRelationTarget($field, $project),
            'validations' => $field->validations,
            'order' => $field->order,
            'parent_field_id' => $field->parent_field_id,
            'project_id' => $field->project_id,
            'collection_id' => $field->collection_id,
        ];
    }
}
