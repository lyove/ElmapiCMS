<?php

namespace App\Http\Controllers;

use App\Ai\Agents\ContentTextAgent;
use App\Events\ContentEvent;
use App\Http\Requests\ContentRequest;
use App\Models\AppSetting;
use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\ContentFieldGroup;
use App\Models\ContentFieldValue;
use App\Models\Field;
use App\Models\Project;
use App\Services\ContentEntryTranslationService;
use App\Services\ContentEntryVersioningService;
use App\Services\RelationCollectionResolver;
use App\Services\RichTextValue;
use App\Support\ContentEntryWebhookNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ContentController extends Controller
{
    public function __construct(
        private ContentEntryTranslationService $contentEntryTranslationService,
        private ContentEntryVersioningService $versioningService
    ) {}

    protected function ensureCollectionBelongsToProject(Project $project, Collection $collection): void
    {
        if ($collection->project_id !== $project->id) {
            abort(404);
        }
    }

    public function create(Project $project, Collection $collection)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        // Singleton: only redirect when every project locale already has an entry (no slot left to create)
        if ($collection->is_singleton) {
            $locales = Arr::wrap($project->locales);
            if ($locales === []) {
                $locales = [$project->default_locale];
            }
            $allLocalesHaveEntry = true;
            foreach ($locales as $locale) {
                if (! $collection->contentEntries()->where('locale', $locale)->exists()) {
                    $allLocalesHaveEntry = false;
                    break;
                }
            }
            if ($allLocalesHaveEntry) {
                $existingEntry = $collection->contentEntries()
                    ->where('locale', $project->default_locale)
                    ->first()
                    ?? $collection->contentEntries()->latest('updated_at')->first();

                return redirect()->route('projects.collections.content.edit', [
                    'project' => $project->id,
                    'collection' => $collection->id,
                    'contentEntry' => $existingEntry->id,
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

    public function store(Project $project, Collection $collection, ContentRequest $request)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        $requestedState = $request->input('state', 'draft');
        if (! in_array($requestedState, ['draft', 'published'])) {
            $requestedState = 'draft';
        }

        $contentEntry = new ContentEntry([
            'project_id' => $project->id,
            'collection_id' => $collection->id,
            'locale' => $request->input('locale', $project->default_locale),
            'state' => 'draft',
            'is_draft_dirty' => true,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        $contentEntry->save();

        $fieldData = $request->input('data', []);
        foreach ($fieldData as $fieldName => $value) {
            $field = $collection->fields()->where('name', $fieldName)->first();

            if (! $field) {
                continue;
            }

            if ($field->type === 'group') {
                $this->saveFieldGroup($contentEntry, $field, $value);
            } elseif (isset($field->options['repeatable']) && $field->options['repeatable'] && is_array($value)) {
                foreach ($value as $item) {
                    $this->saveFieldValue($contentEntry, $field, $item['value'] ?? null);
                }
            } else {
                $this->saveFieldValue($contentEntry, $field, $value);
            }
        }

        if ($collection->is_singleton) {
            $this->contentEntryTranslationService->autoLinkSingletonNewEntry($project, $collection, $contentEntry);
            $contentEntry->refresh();
        }

        $contentEntry->load([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
        ]);

        event(new ContentEvent('content.created', $project, $contentEntry));

        if ($requestedState === 'published') {
            $this->versioningService->publish($contentEntry);
        }

        return response()->json([
            'message' => 'Content '.($requestedState === 'published' ? 'published' : 'saved').' successfully',
            'entry_id' => $contentEntry->id,
        ]);
    }

    public function edit(Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        // Make sure the content entry belongs to this project and collection
        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $collection->load('fields.children');

        // Transform fields to flat list (parent and child fields) for frontend
        $allFields = collect();
        foreach ($collection->fields as $field) {
            $allFields->push($this->transformField($field, $project));
            if ($field->children) {
                foreach ($field->children as $child) {
                    $allFields->push($this->transformField($child, $project));
                }
            }
        }

        // Load field values with media relations and assets, and field groups
        $contentEntry->load([
            'fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
            'creator',
            'updater',
        ]);

        // Format field values into a usable structure for the frontend
        $formattedData = [];

        // First, handle field groups
        foreach ($collection->fields as $field) {
            if ($field->type === 'group') {
                $groupInstances = $contentEntry->fieldGroups()
                    ->where('field_id', $field->id)
                    ->orderBy('sort_order')
                    ->get();

                if ($groupInstances->isEmpty()) {
                    // Initialize empty structure based on repeatable option
                    if (isset($field->options['repeatable']) && $field->options['repeatable']) {
                        $formattedData[$field->name] = [];
                    } else {
                        // For non-repeatable groups, initialize with a single empty instance
                        $instanceData = [];
                        $childFields = $field->children()->orderBy('order')->get();
                        foreach ($childFields as $childField) {
                            $instanceData[$childField->name] = $this->getDefaultFieldValue($childField);
                        }
                        $formattedData[$field->name] = [$instanceData];
                    }

                    continue;
                }

                $groupData = [];
                foreach ($groupInstances as $groupInstance) {
                    $instanceData = [];

                    // Get child fields for this group
                    $childFields = $field->children()->orderBy('order')->get();

                    foreach ($childFields as $childField) {
                        // Find field value for this child field in this group instance
                        $fieldValue = $groupInstance->fieldValues->first(function ($fv) use ($childField) {
                            return $fv->field_id === $childField->id;
                        });

                        if ($fieldValue) {
                            $instanceData[$childField->name] = $this->extractFieldValue($fieldValue, $childField);
                        } else {
                            // Set default value based on field type
                            $instanceData[$childField->name] = $this->getDefaultFieldValue($childField);
                        }
                    }

                    $groupData[] = $instanceData;
                }

                $formattedData[$field->name] = $groupData;
            }
        }

        // Then, handle regular field values (excluding those in groups)
        foreach ($contentEntry->fieldValues as $fieldValue) {
            // Skip field values that belong to a group instance
            if ($fieldValue->group_instance_id !== null) {
                continue;
            }

            $field = $collection->fields->first(function ($field) use ($fieldValue) {
                return $field->id === $fieldValue->field_id;
            });

            if (! $field) {
                continue;
            }

            $value = null;

            // Get the value based on field type
            switch ($fieldValue->field_type) {
                case 'number':
                    $value = $fieldValue->number_value;
                    break;
                case 'boolean':
                    $value = $fieldValue->boolean_value;
                    break;
                case 'date':
                    if (isset($field->options['mode']) && $field->options['mode'] === 'range') {
                        if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                            $value = $fieldValue->datetime_value.' - '.$fieldValue->datetime_value_end;
                        } else {
                            $value = $fieldValue->date_value.' - '.$fieldValue->date_value_end;
                        }
                    } else {
                        if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                            $value = $fieldValue->datetime_value;
                        } else {
                            $value = $fieldValue->date_value;
                        }
                    }
                    break;
                case 'time':
                    $value = $fieldValue->text_value;
                    break;
                case 'enumeration':
                    // For enumeration fields, make sure we have an array
                    $value = $fieldValue->json_value;
                    if (is_null($value)) {
                        $value = $field->options['multiple'] ? [] : null;
                    }
                    // Convert string values to arrays if needed
                    if (is_string($value) && ! empty($value)) {
                        try {
                            $value = json_decode($value, true);
                        } catch (\Exception $e) {
                            // If we can't decode it as JSON, treat as a single value
                            $value = [$value];
                        }
                    }
                    break;
                case 'json':
                    $value = $fieldValue->json_value;
                    break;
                case 'richtext':
                    $value = RichTextValue::forEditor($field, $fieldValue);
                    break;
                case 'media':
                    // Get full asset data for each media relation
                    $assets = $fieldValue->mediaRelations->map(function ($relation) {
                        $asset = $relation->asset;
                        if ($asset) {
                            $asset->full_url = Storage::disk($asset->disk)->url($asset->path);
                            $asset->thumbnail_url = $asset->thumbnail_url;
                            $asset->formatted_size = $asset->getFormattedSize();
                        }

                        return $asset;
                    })->filter()->values()->toArray();

                    $value = $assets;
                    break;
                case 'relation':
                    $value = $fieldValue->valueRelations->pluck('related_id')->toArray();
                    break;
                default:
                    $value = $fieldValue->text_value;
            }

            // Handle repeatable fields
            if (isset($field->options['repeatable']) && $field->options['repeatable']) {
                if (! isset($formattedData[$field->name])) {
                    $formattedData[$field->name] = [];
                }
                $formattedData[$field->name][] = ['value' => $value];
            } else {
                $formattedData[$field->name] = $value;
            }
        }

        $collectionData = $collection->toArray();
        $collectionData['fields'] = $allFields->values()->toArray();

        return Inertia::render('admin/Collections/Show', [
            'project' => $project->load('collections'),
            'collection' => $collectionData,
            'contentEntry' => $contentEntry,
            'formData' => $formattedData,
            'isEditMode' => true,
        ]);
    }

    public function update(ContentRequest $request, Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $contentEntry->locale = $request->input('locale', $project->default_locale);
        $contentEntry->updated_by = Auth::id();
        $contentEntry->updated_at = now();
        $contentEntry->is_draft_dirty = true;
        $contentEntry->save();

        $passwordFields = $collection->fields()->where('type', 'password')->pluck('id');
        $existingPasswords = $contentEntry->fieldValues()
            ->whereIn('field_id', $passwordFields)
            ->get()
            ->keyBy('field_id');

        $contentEntry->fieldValues()->forceDelete();
        $contentEntry->fieldGroups()->forceDelete();

        $fieldData = $request->input('data', []);
        foreach ($fieldData as $fieldName => $value) {
            $field = $collection->fields()->where('name', $fieldName)->first();

            if (! $field) {
                continue;
            }

            if ($field->type === 'group') {
                $this->saveFieldGroup($contentEntry, $field, $value);
            } elseif (isset($field->options['repeatable']) && $field->options['repeatable'] && is_array($value)) {
                foreach ($value as $item) {
                    $this->saveFieldValue($contentEntry, $field, $item['value'] ?? null);
                }
            } else {
                if ($field->type === 'password' && empty($value) && isset($existingPasswords[$field->id])) {
                    $this->saveFieldValue($contentEntry, $field, $existingPasswords[$field->id]->text_value);
                } else {
                    $this->saveFieldValue($contentEntry, $field, $value);
                }
            }
        }

        $contentEntry->load([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
        ]);

        event(new ContentEvent('content.updated', $project, $contentEntry));

        return response()->json([
            'message' => 'Content saved successfully',
            'entry_id' => $contentEntry->id,
        ]);
    }

    protected function saveFieldValue($contentEntry, $field, $value)
    {
        // Skip if value is empty and field is not required
        if (
            (is_null($value) || $value === '') &&
            (! isset($field->validations['required']) || ! $field->validations['required']['status'])
        ) {
            return;
        }

        $fieldValue = new ContentFieldValue([
            'project_id' => $contentEntry->project_id,
            'collection_id' => $contentEntry->collection_id,
            'content_entry_id' => $contentEntry->id,
            'field_id' => $field->id,
            'field_type' => $field->type,
        ]);

        // Set the appropriate value column based on field type
        switch ($field->type) {
            case 'text':
                $fieldValue->text_value = $value;
                break;
            case 'longtext':
                $fieldValue->text_value = $value;
                break;
            case 'richtext':
                RichTextValue::applyToFieldValue($fieldValue, $field, $value);
                break;
            case 'slug':
                $fieldValue->text_value = $value;
                break;
            case 'email':
                $fieldValue->text_value = $value;
                break;
            case 'password':
                if ($value) {
                    $fieldValue->text_value = Hash::isHashed($value)
                        ? $value
                        : Hash::make($value);
                }
                break;
            case 'number':
                $fieldValue->number_value = $value;
                break;
            case 'enumeration':
                $fieldValue->json_value = is_array($value) ? $value : [$value];
                break;
            case 'boolean':
                $fieldValue->boolean_value = (bool) $value;
                break;
            case 'color':
                $fieldValue->text_value = $value;
                break;
            case 'date':
                if (isset($field->options['mode']) && $field->options['mode'] === 'range') {

                    // Handle date range
                    if (is_string($value)) {
                        $dates = explode(' - ', $value);

                        if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                            $fieldValue->datetime_value = $dates[0];
                            $fieldValue->datetime_value_end = $dates[1];
                        } else {
                            $fieldValue->date_value = $dates[0];
                            $fieldValue->date_value_end = $dates[1];
                        }
                    }
                } else {
                    // Handle single date
                    if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                        $fieldValue->datetime_value = $value;
                    } else {
                        $fieldValue->date_value = $value;
                    }
                }
                break;
            case 'time':
                $fieldValue->text_value = $value;
                break;
            case 'media':
                // Ensure value is an array
                $mediaIds = is_array($value) ? $value : [$value];
                // Filter out any null or empty values
                $mediaIds = array_filter($mediaIds, function ($id) {
                    return ! empty($id) && is_numeric($id);
                });
                // Store the IDs in json_value
                $fieldValue->json_value = $mediaIds;
                $fieldValue->save();
                $this->handleMediaRelations($fieldValue, $mediaIds);

                return;
            case 'relation':
                $fieldValue->json_value = is_array($value) ? $value : [$value];
                $fieldValue->save();
                $this->handleRelationFields($fieldValue, $value);

                return;
            case 'json':
                $fieldValue->json_value = is_array($value) ? $value : json_decode($value, true);
                break;
            default:
                $fieldValue->text_value = (string) $value;
                break;
        }

        $fieldValue->save();
    }

    protected function saveFieldGroup($contentEntry, $field, $value)
    {
        // Get child fields for this group
        $childFields = $field->children()->orderBy('order')->get();

        if ($childFields->isEmpty()) {
            return;
        }

        // Check if group is repeatable
        $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];

        // Normalize value to array format
        if ($isRepeatable) {
            // Value should be an array of group instances
            $groupInstances = is_array($value) ? $value : [];
        } else {
            // Value should be a single object, wrap it in array
            $groupInstances = is_array($value) && isset($value[0]) ? $value : ($value ? [$value] : []);
        }

        // Create group instances and save child field values
        foreach ($groupInstances as $sortOrder => $instanceData) {
            if (! is_array($instanceData)) {
                continue;
            }

            // Create the group instance
            $groupInstance = ContentFieldGroup::create([
                'project_id' => $contentEntry->project_id,
                'collection_id' => $contentEntry->collection_id,
                'content_entry_id' => $contentEntry->id,
                'field_id' => $field->id,
                'sort_order' => $sortOrder,
            ]);

            // Save child field values for this group instance
            foreach ($childFields as $childField) {
                $childValue = $instanceData[$childField->name] ?? null;

                if ($childValue !== null) {
                    $this->saveFieldValueForGroup($contentEntry, $childField, $childValue, $groupInstance->id);
                }
            }
        }
    }

    protected function saveFieldValueForGroup($contentEntry, $field, $value, $groupInstanceId)
    {
        // Skip if value is empty and field is not required
        if (
            (is_null($value) || $value === '') &&
            (! isset($field->validations['required']) || ! $field->validations['required']['status'])
        ) {
            return;
        }

        $fieldValue = new ContentFieldValue([
            'project_id' => $contentEntry->project_id,
            'collection_id' => $contentEntry->collection_id,
            'content_entry_id' => $contentEntry->id,
            'field_id' => $field->id,
            'field_type' => $field->type,
            'group_instance_id' => $groupInstanceId,
        ]);

        // Set the appropriate value column based on field type (same logic as saveFieldValue)
        switch ($field->type) {
            case 'text':
                $fieldValue->text_value = $value;
                break;
            case 'longtext':
                $fieldValue->text_value = $value;
                break;
            case 'richtext':
                RichTextValue::applyToFieldValue($fieldValue, $field, $value);
                break;
            case 'slug':
                $fieldValue->text_value = $value;
                break;
            case 'email':
                $fieldValue->text_value = $value;
                break;
            case 'password':
                if ($value) {
                    $fieldValue->text_value = Hash::isHashed($value)
                        ? $value
                        : Hash::make($value);
                }
                break;
            case 'number':
                $fieldValue->number_value = $value;
                break;
            case 'enumeration':
                $fieldValue->json_value = is_array($value) ? $value : [$value];
                break;
            case 'boolean':
                $fieldValue->boolean_value = (bool) $value;
                break;
            case 'color':
                $fieldValue->text_value = $value;
                break;
            case 'date':
                if (isset($field->options['mode']) && $field->options['mode'] === 'range') {
                    if (is_string($value)) {
                        $dates = explode(' - ', $value);

                        if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                            $fieldValue->datetime_value = $dates[0];
                            $fieldValue->datetime_value_end = $dates[1];
                        } else {
                            $fieldValue->date_value = $dates[0];
                            $fieldValue->date_value_end = $dates[1];
                        }
                    }
                } else {
                    if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                        $fieldValue->datetime_value = $value;
                    } else {
                        $fieldValue->date_value = $value;
                    }
                }
                break;
            case 'time':
                $fieldValue->text_value = $value;
                break;
            case 'media':
                $mediaIds = is_array($value) ? $value : [$value];
                $mediaIds = array_filter($mediaIds, function ($id) {
                    return ! empty($id) && is_numeric($id);
                });
                $fieldValue->json_value = $mediaIds;
                $fieldValue->save();
                $this->handleMediaRelations($fieldValue, $mediaIds);

                return;
            case 'relation':
                $fieldValue->json_value = is_array($value) ? $value : [$value];
                $fieldValue->save();
                $this->handleRelationFields($fieldValue, $value);

                return;
            case 'json':
                $fieldValue->json_value = is_array($value) ? $value : json_decode($value, true);
                break;
            default:
                $fieldValue->text_value = (string) $value;
                break;
        }

        $fieldValue->save();
    }

    protected function handleMediaRelations($fieldValue, $mediaIds)
    {
        // If mediaIds is empty, just return
        if (empty($mediaIds)) {
            return;
        }

        // Ensure mediaIds is always an array
        if (! is_array($mediaIds)) {
            $mediaIds = [$mediaIds];
        }

        // Filter out any null or empty values and ensure they are numeric
        $mediaIds = array_filter($mediaIds, function ($id) {
            return ! empty($id) && is_numeric($id);
        });

        // If no valid IDs remain, just return
        if (empty($mediaIds)) {
            return;
        }

        // Delete existing relations
        $fieldValue->mediaRelations()->delete();

        // Create new relations
        foreach ($mediaIds as $mediaId) {
            $fieldValue->mediaRelations()->create([
                'asset_id' => $mediaId,
            ]);
        }
    }

    public function getRelationCollection(Project $project, Collection $collection)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        return $collection->load('fields');
    }

    protected function handleRelationFields($fieldValue, $relationIds)
    {
        if (empty($relationIds)) {
            return;
        }

        if (! is_array($relationIds)) {
            $relationIds = [$relationIds];
        }

        foreach ($relationIds as $index => $relationId) {
            if (empty($relationId)) {
                continue;
            }

            $fieldValue->valueRelations()->create([
                'related_id' => $relationId,
                'related_type' => ContentEntry::class,
                'sort_order' => $index,
            ]);
        }
    }

    /**
     * Soft delete a content entry.
     */
    public function destroy(Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        // Make sure the content entry belongs to this project and collection
        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        event(new ContentEvent('content.trashed', $project, $contentEntry));

        $contentEntry->delete();

        return response()->json([
            'message' => 'Content moved to trash successfully',
        ]);
    }

    /**
     * Permanently delete a content entry.
     */
    public function forceDestroy(Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        // Make sure the content entry belongs to this project and collection
        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        event(new ContentEvent('content.deleted', $project, $contentEntry));

        // Delete related field values and field groups first
        $contentEntry->fieldValues()->forceDelete();
        $contentEntry->fieldGroups()->forceDelete();

        // Force delete the content entry
        $contentEntry->forceDelete();

        return response()->json([
            'message' => 'Content permanently deleted successfully',
        ]);
    }

    /**
     * Publish a content entry: mint a new immutable version from the current draft.
     */
    public function publish(Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $this->versioningService->publish($contentEntry);

        return response()->json([
            'message' => 'Content published successfully',
        ]);
    }

    /**
     * Unpublish a content entry. Versions are retained; draft remains editable.
     */
    public function unpublish(Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $this->versioningService->unpublish($contentEntry);

        return response()->json([
            'message' => 'Content unpublished successfully',
        ]);
    }

    /**
     * Discard unpublished draft edits: restore field rows from the published snapshot.
     * Does not create a new version or change publish state.
     */
    public function discardDraft(Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        if (! $contentEntry->published_version_id || ! $contentEntry->is_draft_dirty) {
            return response()->json(['message' => 'No unpublished changes to discard.'], 422);
        }

        $this->versioningService->discardUnpublishedChanges($contentEntry, Auth::id());

        $contentEntry->refresh();
        $contentEntry->load([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
        ]);

        event(new ContentEvent('content.updated', $project, $contentEntry));

        return response()->json([
            'message' => 'Draft discarded; restored to the published version.',
        ]);
    }

    /**
     * List immutable versions of a content entry (dashboard).
     */
    public function versionsIndex(Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $versions = $contentEntry->versions()
            ->with('creator:id,name')
            ->orderByDesc('version_number')
            ->get();

        return response()->json([
            'data' => $versions->map(fn ($v) => [
                'uuid' => $v->uuid,
                'version_number' => $v->version_number,
                'label' => $v->label,
                'description' => $v->description,
                'published_at' => $v->published_at?->toIso8601String(),
                'created_at' => $v->created_at?->toIso8601String(),
                'created_by' => $v->creator ? ['id' => $v->creator->id, 'name' => $v->creator->name] : null,
                'is_current_published' => $contentEntry->published_version_id === $v->id,
            ])->all(),
            'is_draft_dirty' => (bool) $contentEntry->is_draft_dirty,
            'published_version_number' => $contentEntry->published_version_number,
        ]);
    }

    /**
     * Fetch a single version snapshot payload (dashboard).
     */
    public function versionsShow(Project $project, Collection $collection, ContentEntry $contentEntry, int $version)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $versionModel = $contentEntry->versions()
            ->where('version_number', $version)
            ->with('creator:id,name')
            ->first();

        if (! $versionModel) {
            return response()->json(['message' => 'Version not found.'], 404);
        }

        return response()->json([
            'uuid' => $versionModel->uuid,
            'version_number' => $versionModel->version_number,
            'label' => $versionModel->label,
            'description' => $versionModel->description,
            'published_at' => $versionModel->published_at?->toIso8601String(),
            'created_at' => $versionModel->created_at?->toIso8601String(),
            'created_by' => $versionModel->creator ? ['id' => $versionModel->creator->id, 'name' => $versionModel->creator->name] : null,
            'is_current_published' => $contentEntry->published_version_id === $versionModel->id,
            'snapshot' => $versionModel->snapshot,
        ]);
    }

    /**
     * Revert to a previous version (mints a new version N+1 from the target's snapshot).
     */
    public function versionsRevert(Project $project, Collection $collection, ContentEntry $contentEntry, int $version)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $target = $contentEntry->versions()->where('version_number', $version)->first();
        if (! $target) {
            return response()->json(['message' => 'Version not found.'], 404);
        }

        $new = $this->versioningService->revert($contentEntry, $version, Auth::id());

        return response()->json([
            'message' => "Reverted to version {$version}. Created version {$new->version_number}.",
            'new_version_number' => $new->version_number,
        ]);
    }

    /**
     * Update the label/description on an existing version (metadata only; snapshot stays immutable).
     */
    public function versionsUpdate(Request $request, Project $project, Collection $collection, ContentEntry $contentEntry, int $version)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $target = $contentEntry->versions()->where('version_number', $version)->first();
        if (! $target) {
            return response()->json(['message' => 'Version not found.'], 404);
        }

        if (array_key_exists('label', $validated)) {
            $target->label = $validated['label'];
        }
        if (array_key_exists('description', $validated)) {
            $target->description = $validated['description'];
        }
        $target->save();

        return response()->json(['message' => 'Version updated.']);
    }

    /**
     * Search content entries for data table.
     */
    public function search(Request $request, Project $project, Collection $collection)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        $collection = $collection->load('fields.children');

        $query = ContentEntry::with(['creator:id,name', 'updater:id,name'])
            ->where('content_entries.project_id', $project->id)
            ->where('content_entries.collection_id', $collection->id);

        // Handle trashed filter
        if ($request->input('filter_state') === 'trashed') {
            $query->onlyTrashed();
        } else {
            $query->whereNull('content_entries.deleted_at');
        }

        // Handle search
        if ($request->has('search') && $request->search) {
            $searchTerm = $request->search;

            // Find searchable field values (contains the search term)
            $contentEntryIds = ContentFieldValue::where('project_id', $project->id)
                ->where('collection_id', $collection->id)
                ->where(function ($q) use ($searchTerm) {
                    $q->where('text_value', 'like', "%{$searchTerm}%")
                        ->orWhere('number_value', 'like', "%{$searchTerm}%");
                })
                ->pluck('content_entry_id')
                ->unique();

            // Also include IDs and UUIDs
            $query->where(function ($q) use ($searchTerm, $contentEntryIds) {
                $q->where('content_entries.id', 'like', "%{$searchTerm}%")
                    ->orWhere('content_entries.uuid', 'like', "%{$searchTerm}%")
                    ->orWhereIn('content_entries.id', $contentEntryIds);
            });
        }

        // Handle sorting
        if ($request->has('sort') && $request->sort && $request->input('filter_state') !== 'trashed') {
            $direction = $request->has('direction') && in_array($request->direction, ['asc', 'desc'])
                ? $request->direction
                : 'asc';

            // Special case for field values
            $sortColumn = $request->sort;

            // Standard columns we can sort on directly
            $standardColumns = ['id', 'uuid', 'state', 'created_at', 'updated_at', 'published_at', 'locale'];

            if (in_array($sortColumn, $standardColumns)) {
                $query->orderBy($sortColumn, $direction);
            } else {
                /**
                 * Attempt to sort using dynamic field value.
                 * We join the content_field_values table once for the requested field
                 * and order by the appropriate value column depending on field type.
                 */
                $sortField = $collection->fields->firstWhere('name', $sortColumn);

                if ($sortField) {
                    $alias = 'sort_value';

                    // Ensure we only join once
                    $query->leftJoin("content_field_values as {$alias}", function ($join) use ($alias, $sortField) {
                        $join->on("{$alias}.content_entry_id", '=', 'content_entries.id')
                            ->where("{$alias}.field_id", '=', $sortField->id);
                    });

                    // Select base columns to avoid ambiguous field list
                    $query->select('content_entries.*');

                    // Determine which column to sort on based on field type
                    switch ($sortField->type) {
                        case 'number':
                            $valueColumn = "{$alias}.number_value";
                            break;
                        case 'boolean':
                            $valueColumn = "{$alias}.boolean_value";
                            break;
                        case 'date':
                        case 'datetime':
                            $valueColumn = "{$alias}.date_value";
                            break;
                        default:
                            $valueColumn = "{$alias}.text_value";
                    }

                    // Keep nulls last in a database-agnostic way.
                    $query->orderByRaw("CASE WHEN {$valueColumn} IS NULL THEN 1 ELSE 0 END ASC");
                    $query->orderByRaw("{$valueColumn} {$direction}");
                } else {
                    // Fallback to default order if field not found
                    $query->orderBy('updated_at', 'desc');
                }
            }
        } else {
            // Default sort
            $query->orderBy('updated_at', 'desc');
        }

        // Handle filters
        foreach ($request->all() as $key => $value) {
            if (strpos($key, 'filter_') === 0 && $value) {
                $field = str_replace('filter_', '', $key);

                if (in_array($field, ['state', 'locale'], true)) {
                    if (in_array($field, ['state'], true) && $value === 'trashed') {
                        continue; // skip applying state filter for trashed view
                    }
                    $query->where($field, $value);
                }
            }
        }

        // Handle date range filters for created_at, updated_at, published_at
        foreach (['created_at', 'updated_at', 'published_at'] as $dateField) {
            if ($request->has("{$dateField}_from") && $request->input("{$dateField}_from")) {
                $query->whereDate($dateField, '>=', $request->input("{$dateField}_from"));
            }

            if ($request->has("{$dateField}_to") && $request->input("{$dateField}_to")) {
                $query->whereDate($dateField, '<=', $request->input("{$dateField}_to"));
            }
        }

        // Get content entries with pagination
        $perPage = $request->input('per_page', 10);
        $contentEntries = $query->paginate($perPage);

        // Fetch field values for the content entries
        $entryIds = $contentEntries->pluck('id')->toArray();
        $fieldValues = ContentFieldValue::where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->whereIn('content_entry_id', $entryIds)
            ->whereNull('group_instance_id') // Exclude group field values - they're handled separately
            ->with(['mediaRelations.asset.metadata', 'valueRelations'])
            ->get();

        // Fetch field groups for the content entries
        $fieldGroups = ContentFieldGroup::where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->whereIn('content_entry_id', $entryIds)
            ->with(['fieldValues.field', 'fieldValues.mediaRelations.asset.metadata', 'fieldValues.valueRelations'])
            ->orderBy('sort_order')
            ->get();

        // Group field values by content entry
        $fieldValuesByEntry = [];
        foreach ($fieldValues as $fieldValue) {
            $entryId = $fieldValue->content_entry_id;
            $fieldId = $fieldValue->field_id;

            if (! isset($fieldValuesByEntry[$entryId])) {
                $fieldValuesByEntry[$entryId] = [];
            }

            // without additional query
            $field = $collection->fields->first(function ($field) use ($fieldId) {
                return $field->id === $fieldId;
            });

            if (! $field) {
                continue;
            }

            // Skip fields hidden in content list
            if (isset($field->options['hideInContentList']) && $field->options['hideInContentList']) {
                continue;
            }

            $value = null;

            // Get the value based on field type
            switch ($fieldValue->field_type) {
                case 'number':
                    $value = $fieldValue->number_value;
                    break;
                case 'boolean':
                    $value = $fieldValue->boolean_value;
                    break;
                case 'date':
                    // Check if the field has includeTime option
                    if ($field && isset($field->options['mode']) && $field->options['mode'] === 'range') {
                        if ($field && isset($field->options['includeTime']) && $field->options['includeTime']) {
                            $value = $fieldValue->datetime_value.' - '.$fieldValue->datetime_value_end;
                        } else {
                            $value = $fieldValue->date_value.' - '.$fieldValue->date_value_end;
                        }
                    } else {
                        if ($field && isset($field->options['includeTime']) && $field->options['includeTime']) {
                            $value = $fieldValue->datetime_value;
                        } else {
                            $value = $fieldValue->date_value;
                        }
                    }
                    break;
                case 'time':
                    $value = $fieldValue->text_value;
                    break;
                case 'richtext':
                    $value = RichTextValue::forList($field, $fieldValue);
                    break;
                case 'enumeration':
                    // For enumeration fields, make sure we have an array
                    $value = $fieldValue->json_value;
                    if (is_null($value)) {
                        $value = $field->options['multiple'] ? [] : null;
                    }
                    // Convert string values to arrays if needed
                    if (is_string($value) && ! empty($value)) {
                        try {
                            $value = json_decode($value, true);
                        } catch (\Exception $e) {
                            // If we can't decode it as JSON, treat as a single value
                            $value = [$value];
                        }
                    }
                    break;
                case 'json':
                    $value = $fieldValue->json_value;
                    break;
                case 'enum':
                    $value = $fieldValue->json_value;
                    break;
                case 'media':
                    // Get full asset data for each media relation
                    $assets = $fieldValue->mediaRelations->map(function ($relation) {
                        $asset = $relation->asset;
                        if ($asset) {
                            $asset->full_url = Storage::disk($asset->disk)->url($asset->path);
                            $asset->thumbnail_url = $asset->thumbnail_url;
                            $asset->formatted_size = $asset->getFormattedSize();
                        }

                        return $asset;
                    })->filter()->values()->toArray();

                    $value = $assets;
                    break;
                case 'relation':
                    $value = $fieldValue->valueRelations->pluck('related_id')->toArray();
                    break;
                default:
                    $value = $fieldValue->text_value;
            }

            // Handle repeatable fields: accumulate values instead of overwriting
            $isRepeatable = isset($field->options['repeatable']) && $field->options['repeatable'];

            if ($isRepeatable) {
                if (! isset($fieldValuesByEntry[$entryId][$field->name])) {
                    $fieldValuesByEntry[$entryId][$field->name] = [];
                }
                $fieldValuesByEntry[$entryId][$field->name][] = $value;
            } else {
                $fieldValuesByEntry[$entryId][$field->name] = $value;
            }
        }

        // Process field groups and add them to fieldValuesByEntry
        $groupFields = $collection->fields->where('type', 'group');
        foreach ($fieldGroups as $group) {
            $entryId = $group->content_entry_id;
            $groupField = $groupFields->firstWhere('id', $group->field_id);

            if (! $groupField) {
                continue;
            }

            if (! isset($fieldValuesByEntry[$entryId])) {
                $fieldValuesByEntry[$entryId] = [];
            }

            // Build the group instance data
            $instanceData = [];
            foreach ($group->fieldValues as $fieldValue) {
                $childField = $groupField->children->firstWhere('id', $fieldValue->field_id);
                if (! $childField) {
                    continue;
                }

                // Skip fields hidden in content list
                if (isset($childField->options['hideInContentList']) && $childField->options['hideInContentList']) {
                    continue;
                }

                $value = null;

                // Get the value based on field type (similar to regular field values)
                switch ($fieldValue->field_type) {
                    case 'number':
                        $value = $fieldValue->number_value;
                        break;
                    case 'boolean':
                        $value = $fieldValue->boolean_value;
                        break;
                    case 'date':
                        if (isset($childField->options['mode']) && $childField->options['mode'] === 'range') {
                            if (isset($childField->options['includeTime']) && $childField->options['includeTime']) {
                                $value = $fieldValue->datetime_value.' - '.$fieldValue->datetime_value_end;
                            } else {
                                $value = $fieldValue->date_value.' - '.$fieldValue->date_value_end;
                            }
                        } else {
                            if (isset($childField->options['includeTime']) && $childField->options['includeTime']) {
                                $value = $fieldValue->datetime_value;
                            } else {
                                $value = $fieldValue->date_value;
                            }
                        }
                        break;
                    case 'time':
                        $value = $fieldValue->text_value;
                        break;
                    case 'richtext':
                        $value = RichTextValue::forList($childField, $fieldValue);
                        break;
                    case 'enumeration':
                        $value = $fieldValue->json_value;
                        if (is_null($value)) {
                            $value = $childField->options['multiple'] ?? false ? [] : null;
                        }
                        if (is_string($value) && ! empty($value)) {
                            try {
                                $value = json_decode($value, true);
                            } catch (\Exception $e) {
                                $value = [$value];
                            }
                        }
                        break;
                    case 'json':
                        $value = $fieldValue->json_value;
                        break;
                    case 'media':
                        $assets = $fieldValue->mediaRelations->map(function ($relation) {
                            $asset = $relation->asset;
                            if ($asset) {
                                $asset->full_url = Storage::disk($asset->disk)->url($asset->path);
                                $asset->thumbnail_url = $asset->thumbnail_url;
                                $asset->formatted_size = $asset->getFormattedSize();
                            }

                            return $asset;
                        })->filter()->values()->toArray();
                        $value = $assets;
                        break;
                    case 'relation':
                        $value = $fieldValue->valueRelations->pluck('related_id')->toArray();
                        break;
                    default:
                        $value = $fieldValue->text_value;
                }

                $instanceData[$childField->name] = $value;
            }

            // Add group instance to the entry's group field
            $groupFieldName = $groupField->name;
            if (! isset($fieldValuesByEntry[$entryId][$groupFieldName])) {
                $fieldValuesByEntry[$entryId][$groupFieldName] = [];
            }
            $fieldValuesByEntry[$entryId][$groupFieldName][] = $instanceData;
        }

        // Add field values to content entries
        $contentEntries->getCollection()->transform(function ($entry) use ($fieldValuesByEntry, $groupFields) {
            $entryId = $entry->id;

            if (isset($fieldValuesByEntry[$entryId])) {
                foreach ($fieldValuesByEntry[$entryId] as $fieldName => $value) {
                    $entry->{$fieldName} = $value;
                }
            }

            // For non-repeatable groups, ensure they're always arrays (even if single instance)
            foreach ($groupFields as $groupField) {
                if (! isset($groupField->options['repeatable']) || ! $groupField->options['repeatable']) {
                    if (isset($entry->{$groupField->name}) && ! is_array($entry->{$groupField->name})) {
                        // If it's not an array, wrap it
                        $entry->{$groupField->name} = $entry->{$groupField->name} ? [$entry->{$groupField->name}] : [];
                    }
                }
            }

            return $entry;
        });

        return $contentEntries;
    }

    /**
     * Return specific content entries (by IDs) together with their dynamic field values.
     * This is mainly used by the relation field in edit mode to render already-selected
     * entries without another complex query on the front-end.
     */
    public function find(Request $request, Project $project, Collection $collection)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        $ids = $request->input('ids');
        if (empty($ids)) {
            return [];
        }

        if (! is_array($ids)) {
            $ids = explode(',', (string) $ids);
        }

        $entriesQuery = ContentEntry::where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->whereIn('id', $ids)
            ->with(['creator', 'updater'])
            ->orderByRaw(
                'CASE '.collect($ids)
                    ->values()
                    ->map(fn ($id, $index) => 'WHEN id = '.(int) $id.' THEN '.$index)
                    ->implode(' ')
                .' ELSE '.count($ids).' END'
            );

        $entries = $entriesQuery->get();

        // Attach dynamic field values (re-use logic from search)
        if ($entries->isEmpty()) {
            return $entries;
        }

        // Fetch field values for these entries
        $fieldValues = ContentFieldValue::where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->whereIn('content_entry_id', $ids)
            ->with(['mediaRelations', 'valueRelations'])
            ->get();

        $fields = $collection->fields;

        $fieldValuesByEntry = [];
        foreach ($fieldValues as $fieldValue) {
            $field = $fields->first(fn ($f) => $f->id === $fieldValue->field_id);
            if (! $field) {
                continue;
            }

            $value = null;
            switch ($fieldValue->field_type) {
                case 'number':
                    $value = $fieldValue->number_value;
                    break;
                case 'enumeration':
                case 'json':
                    $value = $fieldValue->json_value;
                    break;
                case 'boolean':
                    $value = $fieldValue->boolean_value;
                    break;
                case 'date':
                case 'time':
                case 'datetime':
                    $value = $fieldValue->datetime_value ?? $fieldValue->date_value;
                    break;
                case 'media':
                    $value = $fieldValue->mediaRelations->pluck('asset_id')->toArray();
                    break;
                case 'relation':
                    $value = $fieldValue->valueRelations->pluck('related_id')->toArray();
                    break;
                default:
                    $value = $fieldValue->text_value;
            }

            $fieldValuesByEntry[$fieldValue->content_entry_id][$field->name] = $value;
        }

        $entries->transform(function ($entry) use ($fieldValuesByEntry) {
            if (isset($fieldValuesByEntry[$entry->id])) {
                foreach ($fieldValuesByEntry[$entry->id] as $key => $val) {
                    $entry->{$key} = $val;
                }
            }

            return $entry;
        });

        return $entries;
    }

    /** Restore soft deleted entry */
    public function restore(Project $project, Collection $collection, $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        $entry = ContentEntry::withTrashed()->where([
            'id' => $contentEntry,
            'project_id' => $project->id,
            'collection_id' => $collection->id,
        ])->firstOrFail();

        $entry->restore();

        $entry->load(['fieldValues.field', 'fieldValues.mediaRelations.asset.metadata', 'fieldValues.valueRelations.related']);

        event(new ContentEvent('content.restored', $project, $entry));

        return response()->json(['message' => 'Content restored']);
    }

    public function duplicate(Project $project, Collection $collection, ContentEntry $contentEntry)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        // Ensure entry belongs to project/collection
        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $newEntry = DB::transaction(function () use ($contentEntry) {
            $newEntry = $contentEntry->replicate(['uuid', 'published_at', 'created_at', 'updated_at']);
            $newEntry->state = 'draft';
            $newEntry->created_by = auth()->id();
            $newEntry->updated_by = auth()->id();
            $newEntry->push();

            // clone field groups first
            $contentEntry->fieldGroups()->with(['fieldValues.mediaRelations', 'fieldValues.valueRelations'])->get()->each(function ($fg) use ($newEntry) {
                $newGroup = $fg->replicate(['content_entry_id', 'created_at', 'updated_at']);
                $newGroup->content_entry_id = $newEntry->id;
                $newGroup->push();

                // clone field values for this group
                $fg->fieldValues->each(function ($fv) use ($newGroup, $newEntry) {
                    $newValue = $fv->replicate(['content_entry_id', 'group_instance_id', 'created_at', 'updated_at']);
                    $newValue->content_entry_id = $newEntry->id;
                    $newValue->group_instance_id = $newGroup->id;
                    $newValue->push();

                    // media relations
                    $fv->mediaRelations->each(function ($mr) use ($newValue) {
                        $newMr = $mr->replicate(['field_value_id']);
                        $newMr->field_value_id = $newValue->id;
                        $newMr->push();
                    });

                    // value relations (relation field)
                    $fv->valueRelations->each(function ($vr) use ($newValue) {
                        $newVr = $vr->replicate(['field_value_id']);
                        $newVr->field_value_id = $newValue->id;
                        $newVr->push();
                    });
                });
            });

            // clone regular field values (not in groups)
            $contentEntry->fieldValues()->whereNull('group_instance_id')->with(['mediaRelations', 'valueRelations'])->get()->each(function ($fv) use ($newEntry) {
                $newValue = $fv->replicate(['content_entry_id', 'created_at', 'updated_at']);
                $newValue->content_entry_id = $newEntry->id;
                $newValue->push();

                // media relations
                $fv->mediaRelations->each(function ($mr) use ($newValue) {
                    $newMr = $mr->replicate(['field_value_id']);
                    $newMr->field_value_id = $newValue->id;
                    $newMr->push();
                });

                // value relations (relation field)
                $fv->valueRelations->each(function ($vr) use ($newValue) {
                    $newVr = $vr->replicate(['field_value_id']);
                    $newVr->field_value_id = $newValue->id;
                    $newVr->push();
                });
            });

            return $newEntry;
        });

        return response()->json([
            'message' => 'Content duplicated',
            'entry_id' => $newEntry->id,
        ], 201);
    }

    protected function extractFieldValue($fieldValue, $field)
    {
        switch ($field->type) {
            case 'number':
                return $fieldValue->number_value;
            case 'boolean':
                return $fieldValue->boolean_value;
            case 'date':
                if (isset($field->options['mode']) && $field->options['mode'] === 'range') {
                    if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                        return $fieldValue->datetime_value.' - '.$fieldValue->datetime_value_end;
                    } else {
                        return $fieldValue->date_value.' - '.$fieldValue->date_value_end;
                    }
                } else {
                    if (isset($field->options['includeTime']) && $field->options['includeTime']) {
                        return $fieldValue->datetime_value;
                    } else {
                        return $fieldValue->date_value;
                    }
                }
            case 'time':
                return $fieldValue->text_value;
            case 'enumeration':
                $value = $fieldValue->json_value;
                if (is_null($value)) {
                    return $field->options['multiple'] ?? false ? [] : null;
                }
                if (is_string($value) && ! empty($value)) {
                    try {
                        return json_decode($value, true);
                    } catch (\Exception $e) {
                        return [$value];
                    }
                }

                return $value;
            case 'json':
                return $fieldValue->json_value;
            case 'richtext':
                return RichTextValue::forEditor($field, $fieldValue);
            case 'media':
                $assets = $fieldValue->mediaRelations->map(function ($relation) {
                    $asset = $relation->asset;
                    if ($asset) {
                        $asset->full_url = Storage::disk($asset->disk)->url($asset->path);
                        $asset->thumbnail_url = $asset->thumbnail_url;
                        $asset->formatted_size = $asset->getFormattedSize();
                    }

                    return $asset;
                })->filter()->values()->toArray();

                return $assets;
            case 'relation':
                return $fieldValue->valueRelations->pluck('related_id')->toArray();
            default:
                return $fieldValue->text_value;
        }
    }

    protected function getDefaultFieldValue($field)
    {
        if ($field->type === 'boolean') {
            return false;
        } elseif ($field->type === 'enumeration' && ($field->options['multiple'] ?? false)) {
            return [];
        } elseif (in_array($field->type, ['media', 'relation'])) {
            return [];
        } elseif ($field->type === 'json') {
            return null;
        } else {
            return '';
        }
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

    /**
     * Link a translation entry to the current entry
     */
    public function linkTranslation(Project $project, Collection $collection, ContentEntry $contentEntry, Request $request)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        // Ensure entry belongs to project/collection
        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $validated = $request->validate([
            'translation_entry_id' => 'required|exists:content_entries,id',
        ]);

        $translationEntry = ContentEntry::findOrFail($validated['translation_entry_id']);

        // Ensure translation entry belongs to same project/collection
        if ($translationEntry->project_id !== $project->id || $translationEntry->collection_id !== $collection->id) {
            return response()->json(['message' => 'Translation entry must belong to the same project and collection.'], 422);
        }

        // Ensure different locale
        if ($translationEntry->locale === $contentEntry->locale) {
            return response()->json(['message' => 'Translation entry must have a different locale.'], 422);
        }

        $this->contentEntryTranslationService->linkTwoEntries($contentEntry, $translationEntry);

        $contentEntry->refresh();

        return response()->json([
            'message' => 'Translation linked successfully',
            'translation_group_id' => $contentEntry->translation_group_id,
        ]);
    }

    /**
     * Unlink a translation entry from the current entry
     */
    public function unlinkTranslation(Project $project, Collection $collection, ContentEntry $contentEntry, Request $request)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        // Ensure entry belongs to project/collection
        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $validated = $request->validate([
            'translation_entry_id' => 'required|exists:content_entries,id',
        ]);

        $translationEntry = ContentEntry::findOrFail($validated['translation_entry_id']);

        // Ensure they're in the same translation group
        if (! $contentEntry->translation_group_id || $translationEntry->translation_group_id !== $contentEntry->translation_group_id) {
            return response()->json(['message' => 'Entries are not linked as translations.'], 422);
        }

        DB::transaction(function () use ($contentEntry, $translationEntry) {
            // Remove translation_group_id from the translation entry
            $translationEntry->translation_group_id = null;
            $translationEntry->save();

            // Check if there are other entries in the group
            $remainingEntries = ContentEntry::where('translation_group_id', $contentEntry->translation_group_id)
                ->where('id', '!=', $translationEntry->id)
                ->count();

            // If only one entry remains, we could optionally remove its group_id too
            // But keeping it allows for easier re-linking later
        });

        $translationEntry->refresh();
        ContentEntryWebhookNotifier::dispatch('content.updated', $project, $translationEntry, 'cms');

        return response()->json([
            'message' => 'Translation unlinked successfully',
        ]);
    }

    /**
     * Create a blank entry in the target locale and link it as a translation.
     */
    public function createTranslation(Project $project, Collection $collection, ContentEntry $contentEntry, Request $request)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $validated = $request->validate([
            'target_locale' => 'required|string|max:10',
        ]);

        $targetLocale = $validated['target_locale'];

        // Validate locale is in project's available locales
        $projectLocales = $project->locales ?? [];
        if (is_string($projectLocales)) {
            $projectLocales = array_filter(explode(',', $projectLocales));
        }
        if (! in_array($targetLocale, $projectLocales)) {
            return response()->json(['message' => "Locale \"{$targetLocale}\" is not available in this project."], 422);
        }

        // Check no translation already exists for this locale
        if ($contentEntry->translation_group_id) {
            $existing = ContentEntry::where('translation_group_id', $contentEntry->translation_group_id)
                ->where('locale', $targetLocale)
                ->exists();
            if ($existing) {
                return response()->json(['message' => "A translation for locale \"{$targetLocale}\" already exists."], 422);
            }
        }

        $state = $collection->is_singleton ? 'published' : 'draft';

        $newEntry = DB::transaction(function () use ($project, $collection, $contentEntry, $targetLocale, $state) {
            $newEntry = new ContentEntry([
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'locale' => $targetLocale,
                'state' => $state,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);
            if ($state === 'published') {
                $newEntry->published_at = now();
            }
            $newEntry->save();

            // Link translation group
            if (! $contentEntry->translation_group_id) {
                $contentEntry->translation_group_id = (string) Str::uuid();
                $contentEntry->save();
            }
            $newEntry->translation_group_id = $contentEntry->translation_group_id;
            $newEntry->save();

            return $newEntry;
        });

        return response()->json([
            'message' => 'Translation entry created successfully',
            'entry_id' => $newEntry->id,
        ]);
    }

    /**
     * Translate an entry with AI and create a new entry in the target locale.
     */
    public function translateWithAi(Project $project, Collection $collection, ContentEntry $contentEntry, Request $request)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        // Ensure entry belongs to project/collection
        if ($contentEntry->project_id !== $project->id || $contentEntry->collection_id !== $collection->id) {
            abort(404);
        }

        $validated = $request->validate([
            'target_locale' => 'required|string|max:10',
        ]);

        $targetLocale = $validated['target_locale'];

        // Validate locale is in project's available locales
        $projectLocales = $project->locales ?? [];
        if (is_string($projectLocales)) {
            $projectLocales = array_filter(explode(',', $projectLocales));
        }
        if (! in_array($targetLocale, $projectLocales)) {
            return response()->json(['message' => "Locale \"{$targetLocale}\" is not available in this project."], 422);
        }

        // Check no translation already exists for this locale
        if ($contentEntry->translation_group_id) {
            $existing = ContentEntry::where('translation_group_id', $contentEntry->translation_group_id)
                ->where('locale', $targetLocale)
                ->exists();
            if ($existing) {
                return response()->json(['message' => "A translation for locale \"{$targetLocale}\" already exists."], 422);
            }
        }

        // Check AI is enabled and configured
        $settings = AppSetting::query()->latest('id')->first();
        if (! $settings?->ai_enabled) {
            return response()->json(['message' => 'AI assistant is disabled.'], 403);
        }

        $providerName = $settings->ai_provider ?? 'anthropic';
        $providerConfig = config("ai.providers.{$providerName}");
        if (! $providerConfig || empty($providerConfig['key'])) {
            return response()->json(['message' => "The AI provider \"{$providerName}\" is not configured."], 422);
        }

        $driver = $providerConfig['driver'] ?? $providerName;
        $model = $settings->ai_model ?: null;
        $maxTokens = $settings->ai_max_tokens ?? 4096;
        $provider = $providerName;

        // Load the original entry with all field values and groups
        $contentEntry->load([
            'fieldValues.field',
            'fieldValues.mediaRelations',
            'fieldValues.valueRelations',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations',
            'fieldGroups.fieldValues.valueRelations',
        ]);

        // Collect all translatable fields for progress tracking
        $translatableTypes = ['text', 'longtext', 'richtext'];
        $allFieldValues = $contentEntry->fieldValues;
        $groupFieldValues = $contentEntry->fieldGroups->flatMap(fn ($g) => $g->fieldValues);
        $translatableFields = $allFieldValues->filter(fn ($fv) => in_array($fv->field_type, $translatableTypes) && ! empty($fv->text_value))
            ->merge($groupFieldValues->filter(fn ($fv) => in_array($fv->field_type, $translatableTypes) && ! empty($fv->text_value)));
        $totalTranslatable = $translatableFields->count();

        return response()->stream(function () use (
            $contentEntry, $collection, $project, $targetLocale,
            $provider, $model, $maxTokens, $driver,
            $translatableTypes, $totalTranslatable
        ) {
            $sendEvent = function ($data) {
                echo 'data: '.json_encode($data)."\n\n";
                if (ob_get_level()) {
                    ob_flush();
                }
                flush();
            };

            try {
                $totalUsage = ['prompt_tokens' => 0, 'completion_tokens' => 0];
                $translatedIndex = 0;

                // Create new entry (singleton collections are published immediately)
                $entryState = $collection->is_singleton ? 'published' : 'draft';
                $newEntry = new ContentEntry([
                    'project_id' => $project->id,
                    'collection_id' => $collection->id,
                    'locale' => $targetLocale,
                    'state' => $entryState,
                    'created_by' => Auth::id(),
                    'updated_by' => Auth::id(),
                ]);
                if ($entryState === 'published') {
                    $newEntry->published_at = now();
                }
                $newEntry->save();

                // Link translation group
                DB::transaction(function () use ($contentEntry, $newEntry) {
                    if (! $contentEntry->translation_group_id) {
                        $contentEntry->translation_group_id = (string) Str::uuid();
                        $contentEntry->save();
                    }
                    $newEntry->translation_group_id = $contentEntry->translation_group_id;
                    $newEntry->save();
                });

                $sendEvent(['type' => 'progress', 'message' => 'Entry created, starting translation...', 'index' => 0, 'total' => $totalTranslatable]);

                // Helper to translate a single text value
                $translateText = function (string $text, string $fieldType, string $fieldLabel) use (
                    $provider, $model, $maxTokens, $driver, $targetLocale, &$totalUsage
                ) {
                    $systemPrompt = $fieldType === 'richtext'
                        ? "You are a translator. Translate the following HTML content to {$targetLocale}. Preserve all HTML tags, attributes, and structure exactly. Only translate the text content between tags. Return only the translated HTML, no explanations."
                        : "You are a translator. Translate the following text to {$targetLocale}. Return only the translated text, no explanations.";

                    $result = (new ContentTextAgent($systemPrompt, $maxTokens))->prompt(
                        $text,
                        provider: $provider,
                        model: $model ?? $this->defaultModelFor($driver),
                        timeout: 60,
                    );

                    $totalUsage['prompt_tokens'] += $result->usage->promptTokens;
                    $totalUsage['completion_tokens'] += $result->usage->completionTokens;

                    return trim((string) $result);
                };

                // Track translated text values by field name for slug generation
                $translatedTexts = [];

                // Helper to copy/translate a single field value
                $processFieldValue = function (ContentFieldValue $original, int $newEntryId, ?int $groupInstanceId = null) use (
                    $translateText, $translatableTypes, &$translatedIndex, $totalTranslatable, $sendEvent, &$translatedTexts
                ) {
                    $field = $original->field;
                    if (! $field) {
                        return;
                    }

                    // Skip password fields
                    if ($field->type === 'password') {
                        return;
                    }

                    // Skip slug fields -- handled after all other fields are translated
                    if ($field->type === 'slug') {
                        return;
                    }

                    $newFv = new ContentFieldValue([
                        'project_id' => $original->project_id,
                        'collection_id' => $original->collection_id,
                        'content_entry_id' => $newEntryId,
                        'field_id' => $original->field_id,
                        'field_type' => $original->field_type,
                        'group_instance_id' => $groupInstanceId,
                    ]);

                    if (in_array($field->type, $translatableTypes) && ! empty($original->text_value)) {
                        $translatedIndex++;
                        $fieldLabel = $field->label ?? $field->name;
                        $sendEvent([
                            'type' => 'progress',
                            'message' => "Translating \"{$fieldLabel}\"...",
                            'field' => $fieldLabel,
                            'index' => $translatedIndex,
                            'total' => $totalTranslatable,
                        ]);

                        try {
                            $translated = $translateText($original->text_value, $field->type, $fieldLabel);

                            if ($field->type === 'richtext') {
                                $newFv->text_value = $translated;
                                $newFv->json_value = null; // Editor will work with HTML
                            } else {
                                $newFv->text_value = $translated;
                            }

                            // Track translated value for slug generation
                            $translatedTexts[$field->name] = $translated;
                        } catch (\Throwable $e) {
                            // If translation fails, copy original value
                            $newFv->text_value = $original->text_value;
                            if ($field->type === 'richtext') {
                                $newFv->json_value = $original->json_value;
                            }
                            $translatedTexts[$field->name] = $original->text_value;
                            $sendEvent(['type' => 'warning', 'message' => "Failed to translate \"{$fieldLabel}\": {$e->getMessage()}"]);
                        }
                    } else {
                        // Copy all value columns as-is
                        $newFv->text_value = $original->text_value;
                        $newFv->number_value = $original->number_value;
                        $newFv->boolean_value = $original->boolean_value;
                        $newFv->date_value = $original->date_value;
                        $newFv->date_value_end = $original->date_value_end;
                        $newFv->datetime_value = $original->datetime_value;
                        $newFv->datetime_value_end = $original->datetime_value_end;
                        $newFv->json_value = $original->json_value;

                        // Track text value for slug generation
                        if ($field->type === 'text' && ! empty($original->text_value)) {
                            $translatedTexts[$field->name] = $original->text_value;
                        }
                    }

                    $newFv->save();

                    // Copy media relations
                    if ($field->type === 'media' && $original->mediaRelations->isNotEmpty()) {
                        foreach ($original->mediaRelations as $mr) {
                            $newFv->mediaRelations()->create([
                                'asset_id' => $mr->asset_id,
                            ]);
                        }
                    }

                    // Copy relation fields
                    if ($field->type === 'relation' && $original->valueRelations->isNotEmpty()) {
                        foreach ($original->valueRelations as $vr) {
                            $newFv->valueRelations()->create([
                                'related_id' => $vr->related_id,
                                'related_type' => $vr->related_type,
                                'sort_order' => $vr->sort_order,
                            ]);
                        }
                    }
                };

                // Process top-level field values (non-grouped)
                foreach ($contentEntry->fieldValues->whereNull('group_instance_id') as $fv) {
                    $processFieldValue($fv, $newEntry->id);
                }

                // Process field groups
                foreach ($contentEntry->fieldGroups as $group) {
                    $newGroup = ContentFieldGroup::create([
                        'project_id' => $group->project_id,
                        'collection_id' => $group->collection_id,
                        'content_entry_id' => $newEntry->id,
                        'field_id' => $group->field_id,
                        'sort_order' => $group->sort_order,
                    ]);

                    foreach ($group->fieldValues as $fv) {
                        $processFieldValue($fv, $newEntry->id, $newGroup->id);
                    }
                }

                // Process slug fields: generate from translated source text field
                // Look at collection schema (not entry field values) since slug may have no stored value
                $slugFields = $collection->fields()->where('type', 'slug')->get();
                foreach ($slugFields as $slugField) {
                    $sourceFieldName = $slugField->options['slug']['field'] ?? null;
                    $slugSource = $sourceFieldName && isset($translatedTexts[$sourceFieldName])
                        ? $translatedTexts[$sourceFieldName]
                        : '';

                    if (empty($slugSource)) {
                        continue;
                    }

                    $newSlugFv = new ContentFieldValue([
                        'project_id' => $project->id,
                        'collection_id' => $collection->id,
                        'content_entry_id' => $newEntry->id,
                        'field_id' => $slugField->id,
                        'field_type' => 'slug',
                    ]);
                    $newSlugFv->text_value = Str::slug($slugSource);
                    $newSlugFv->save();
                }

                $sendEvent([
                    'type' => 'done',
                    'entry_id' => $newEntry->id,
                    'usage' => $totalUsage,
                ]);
            } catch (\Throwable $e) {
                $sendEvent(['type' => 'error', 'message' => $e->getMessage()]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Get a sensible default model for a driver.
     */
    protected function defaultModelFor(string $driver): string
    {
        return match ($driver) {
            'anthropic' => 'claude-sonnet-4-20250514',
            'openai' => 'gpt-4o-mini',
            'gemini' => 'gemini-2.0-flash',
            'deepseek' => 'deepseek-chat',
            'groq' => 'llama-3.1-8b-instant',
            'mistral' => 'mistral-small-latest',
            'xai' => 'grok-2',
            default => 'default',
        };
    }

    /**
     * Export content entries to JSON, CSV, or Excel
     */
    public function export(Request $request, Project $project, Collection $collection)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        $validated = $request->validate([
            'format' => 'required|in:json,csv,excel',
            'state' => 'nullable|in:published,draft,all',
        ]);

        $query = $collection->contentEntries()
            ->with(['fieldValues.field']);

        // Filter by state if specified
        $state = $validated['state'] ?? 'all';
        if ($state === 'published') {
            $query->where('state', 'published');
        } elseif ($state === 'draft') {
            $query->where('state', 'draft');
        }
        // If 'all' or not specified, export all entries regardless of state

        $entries = $query->get();

        $fields = $collection->fields()->orderBy('order')->get();
        $fieldMap = $fields->keyBy('name');

        $data = [];
        foreach ($entries as $entry) {
            $row = [
                'id' => $entry->id,
                'uuid' => $entry->uuid,
                'locale' => $entry->locale,
                'state' => $entry->state,
                'created_at' => $entry->created_at,
                'updated_at' => $entry->updated_at,
            ];

            foreach ($fields as $field) {
                $fieldValues = $entry->fieldValues()->where('field_id', $field->id)->get();

                if ($fieldValues->isEmpty()) {
                    $row[$field->name] = null;

                    continue;
                }

                $values = $fieldValues->map(function ($fv) use ($field) {
                    switch ($field->type) {
                        case 'number':
                            return $fv->number_value;
                        case 'boolean':
                            return $fv->boolean_value ? 'true' : 'false';
                        case 'date':
                        case 'datetime':
                            return $fv->date_value ?? $fv->datetime_value;
                        case 'enumeration':
                        case 'json':
                        case 'relation':
                        case 'media':
                            return json_encode($fv->json_value);
                        default:
                            return $fv->text_value;
                    }
                })->toArray();

                $row[$field->name] = ($field->options['repeatable'] ?? false) ? json_encode($values) : ($values[0] ?? null);
            }

            $data[] = $row;
        }

        $format = $validated['format'];

        if ($format === 'json') {
            return response()->json($data)
                ->header('Content-Type', 'application/json')
                ->header('Content-Disposition', 'attachment; filename="content_'.$collection->slug.'_'.date('Y-m-d').'.json"');
        }

        if ($format === 'csv') {
            if (empty($data)) {
                return response('', 200)
                    ->header('Content-Type', 'text/csv')
                    ->header('Content-Disposition', 'attachment; filename="content_'.$collection->slug.'_'.date('Y-m-d').'.csv"');
            }

            $headers = array_keys($data[0]);
            $csv = fopen('php://temp', 'r+');
            fputcsv($csv, $headers);

            foreach ($data as $row) {
                fputcsv($csv, array_values($row));
            }

            rewind($csv);
            $csvContent = stream_get_contents($csv);
            fclose($csv);

            return response($csvContent)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="content_'.$collection->slug.'_'.date('Y-m-d').'.csv"');
        }

        // Excel format - For now, we'll return CSV content with .xlsx extension
        // Note: This creates a CSV file with .xlsx extension. For proper Excel format,
        // consider using PhpSpreadsheet library in the future.
        if ($format === 'excel') {
            if (empty($data)) {
                return response('', 200)
                    ->header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                    ->header('Content-Disposition', 'attachment; filename="content_'.$collection->slug.'_'.date('Y-m-d').'.xlsx"');
            }

            $headers = array_keys($data[0]);
            $csv = fopen('php://temp', 'r+');
            fputcsv($csv, $headers);

            foreach ($data as $row) {
                fputcsv($csv, array_values($row));
            }

            rewind($csv);
            $csvContent = stream_get_contents($csv);
            fclose($csv);

            return response($csvContent)
                ->header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                ->header('Content-Disposition', 'attachment; filename="content_'.$collection->slug.'_'.date('Y-m-d').'.xlsx"');
        }

        return response()->json(['message' => 'Invalid format'], 422);
    }

    /**
     * Import content entries from JSON, CSV, or Excel
     */
    public function import(Request $request, Project $project, Collection $collection)
    {
        $this->ensureCollectionBelongsToProject($project, $collection);

        $validated = $request->validate([
            'file' => 'required|file|mimes:json,csv,txt,xlsx,xls',
        ]);

        $file = $request->file('file');
        $extension = $file->getClientOriginalExtension();
        $content = file_get_contents($file->getRealPath());

        $data = [];

        if ($extension === 'json') {
            $data = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json(['message' => 'Invalid JSON file'], 422);
            }
        } else {
            // Handle CSV/Excel - use fgetcsv to properly handle quoted fields with newlines
            $filePath = $file->getRealPath();
            $handle = fopen($filePath, 'r');

            if ($handle === false) {
                return response()->json(['message' => 'Could not read file'], 422);
            }

            // Read headers
            $headers = fgetcsv($handle);
            if ($headers === false || empty($headers)) {
                fclose($handle);

                return response()->json(['message' => 'Invalid CSV file - no headers found'], 422);
            }

            // Read data rows
            while (($row = fgetcsv($handle)) !== false) {
                // Skip completely empty rows
                if (empty(array_filter($row, function ($value) {
                    return $value !== null && trim($value) !== '';
                }))) {
                    continue;
                }

                // Map row values to headers
                $rowData = [];
                foreach ($headers as $index => $header) {
                    $value = $row[$index] ?? null;
                    // Convert empty strings to null for consistency
                    $rowData[$header] = ($value !== null && trim($value) === '') ? null : $value;
                }

                // Only add rows that have at least one non-empty field (besides id/uuid/timestamps)
                $hasData = false;
                $skipFields = ['id', 'uuid', 'created_at', 'updated_at'];
                foreach ($rowData as $key => $value) {
                    if (! in_array($key, $skipFields) && $value !== null && trim($value) !== '') {
                        $hasData = true;
                        break;
                    }
                }

                if ($hasData) {
                    $data[] = $rowData;
                }
            }

            fclose($handle);
        }

        if (empty($data)) {
            return response()->json(['message' => 'No data found in file'], 422);
        }

        $fields = $collection->fields()->orderBy('order')->get();
        $fieldMap = $fields->keyBy('name');

        $imported = 0;
        $errors = [];

        DB::transaction(function () use ($project, $collection, $data, $fieldMap, &$imported, &$errors) {
            foreach ($data as $index => $row) {
                try {
                    $entry = $collection->contentEntries()->create([
                        'project_id' => $project->id,
                        'locale' => $row['locale'] ?? $project->default_locale,
                        'state' => $row['state'] ?? 'published',
                        'translation_group_id' => $row['translation_group_id'] ?? null,
                        'created_by' => auth()->id(),
                        'updated_by' => auth()->id(),
                        'published_at' => (($row['state'] ?? 'published') === 'published') ? now() : null,
                    ]);

                    foreach ($row as $fieldName => $value) {
                        if (in_array($fieldName, ['id', 'uuid', 'locale', 'state', 'translation_group_id', 'created_at', 'updated_at'], true)) {
                            continue;
                        }

                        if (! $fieldMap->has($fieldName)) {
                            continue;
                        }

                        $field = $fieldMap[$fieldName];

                        if ($value === null || $value === '') {
                            continue;
                        }

                        $this->saveFieldValueForImport($entry, $field, $value, $project, $collection);
                    }

                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = 'Row '.($index + 1).': '.$e->getMessage();
                }
            }
        });

        return response()->json([
            'message' => "Imported {$imported} entries",
            'imported' => $imported,
            'errors' => $errors,
        ]);
    }

    /**
     * Save field value for imported content
     */
    protected function saveFieldValueForImport(ContentEntry $entry, Field $field, $value, Project $project, Collection $collection)
    {
        $isRepeatable = $field->options['repeatable'] ?? false;

        // Handle JSON-encoded values (from repeatable fields or JSON fields)
        if (is_string($value) && (str_starts_with($value, '[') || str_starts_with($value, '{'))) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $value = $decoded;
            }
        }

        // Handle group fields
        if ($field->type === 'group') {
            $this->saveFieldGroup($entry, $field, $value);

            return;
        }

        if ($isRepeatable && is_array($value)) {
            foreach ($value as $item) {
                $this->createFieldValueForImport($entry, $field, $item, $project, $collection);
            }
        } else {
            $this->createFieldValueForImport($entry, $field, $value, $project, $collection);
        }
    }

    /**
     * Create a single field value for import
     */
    protected function createFieldValueForImport(ContentEntry $entry, Field $field, $value, Project $project, Collection $collection)
    {
        // Use the existing saveFieldValue method which handles all field types properly
        // But we need to handle the case where value might be a string that needs parsing
        if ($value === null || $value === '') {
            return;
        }

        // For certain field types, parse JSON strings
        if (in_array($field->type, ['json', 'enumeration', 'relation', 'media']) && is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $value = $decoded;
            }
        }

        // Use existing saveFieldValue method
        $this->saveFieldValue($entry, $field, $value);
    }
}
