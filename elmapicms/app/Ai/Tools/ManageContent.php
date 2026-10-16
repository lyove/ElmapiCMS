<?php

namespace App\Ai\Tools;

use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\ContentFieldGroup;
use App\Models\ContentFieldValue;
use App\Models\Field;
use App\Models\Project;
use App\Services\ContentEntryTranslationService;
use App\Services\RichTextValue;
use App\Support\ContentEntryWebhookNotifier;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;

class ManageContent implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): string
    {
        return 'Manage content entries: list, get, create, update, publish, count, and manage translations.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): string
    {
        $action = trim((string) $request->string('action'));
        $projectId = (int) (string) $request->string('project_id');
        $collectionInput = trim((string) $request->string('collection'));
        $entryId = (int) (string) $request->string('entry_id');
        $targetEntryId = (int) (string) $request->string('target_entry_id');

        $user = auth()->user();

        // Validate project access
        $project = Project::find($projectId);
        if (! $project) {
            return json_encode(['error' => "Project {$projectId} not found."]);
        }

        if (! $user->can('access_all_projects') && ! $user->projects()->where('projects.id', $project->id)->exists()) {
            return json_encode(['error' => 'You do not have access to this project.']);
        }

        // Resolve collection by name, slug, or ID
        $collection = $this->resolveCollection($project, $collectionInput);
        if (! $collection) {
            return json_encode(['error' => "Collection \"{$collectionInput}\" not found in project \"{$project->name}\"."]);
        }

        return match ($action) {
            'list_entries' => $this->listEntries($project, $collection, $request),
            'get_entry' => $this->getEntry($project, $collection, $entryId),
            'create_entry' => $this->createEntry($user, $project, $collection, $request),
            'update_entry' => $this->updateEntry($user, $project, $collection, $entryId, $request),
            'publish_entry' => $this->publishEntry($user, $project, $collection, $entryId, $request),
            'count_entries' => $this->countEntries($project, $collection, $request),
            'link_translation' => $this->linkTranslation($project, $collection, $entryId, $targetEntryId),
            'unlink_translation' => $this->unlinkTranslation($project, $collection, $entryId),
            default => json_encode(['error' => "Unknown action \"{$action}\". Use: list_entries, get_entry, create_entry, update_entry, publish_entry, count_entries, link_translation, unlink_translation."]),
        };
    }

    // ─── Collection Resolution ───────────────────────────────────────

    protected function resolveCollection(Project $project, string $input): ?Collection
    {
        if ($input === '') {
            return null;
        }

        return Collection::where('project_id', $project->id)
            ->where(function ($q) use ($input) {
                $q->where('id', is_numeric($input) ? (int) $input : 0)
                    ->orWhere('slug', $input)
                    ->orWhere('name', $input);
            })->first();
    }

    // ─── Actions ─────────────────────────────────────────────────────

    protected function listEntries(Project $project, Collection $collection, Request $request): string
    {
        $state = trim((string) $request->string('state'));
        $search = trim((string) $request->string('search'));
        $locale = trim((string) $request->string('locale'));
        $limit = min(max((int) (string) $request->string('limit') ?: 10, 1), 50);

        $query = ContentEntry::where('project_id', $project->id)
            ->where('collection_id', $collection->id);

        if ($state !== '' && in_array($state, ['draft', 'published'])) {
            $query->where('state', $state);
        }

        if ($locale !== '') {
            $query->where('locale', $locale);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $search);
                $q->whereHas('fieldValues', function ($fv) use ($escaped) {
                    $fv->where('text_value', 'like', "%{$escaped}%");
                });
            });
        }

        $entries = $query->latest()->limit($limit)->get();

        $fields = $collection->fields()->orderBy('order')->get();

        $result = [
            'collection' => $collection->name,
            'total' => ContentEntry::where('project_id', $project->id)
                ->where('collection_id', $collection->id)->count(),
            'showing' => $entries->count(),
            'entries' => $entries->map(fn ($entry) => $this->formatEntry($entry, $fields, summarize: true))->toArray(),
        ];

        return json_encode($result);
    }

    protected function getEntry(Project $project, Collection $collection, int $entryId): string
    {
        if ($entryId <= 0) {
            return json_encode(['error' => 'entry_id is required for get_entry.']);
        }

        $entry = ContentEntry::where('id', $entryId)
            ->where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->first();

        if (! $entry) {
            return json_encode(['error' => "Entry {$entryId} not found."]);
        }

        $fields = $collection->fields()->orderBy('order')->get();

        $result = $this->formatEntry($entry, $fields, true);

        // Include translation info
        if ($entry->translation_group_id) {
            $translations = ContentEntry::where('translation_group_id', $entry->translation_group_id)
                ->where('id', '!=', $entry->id)
                ->get(['id', 'locale', 'state']);
            $result['translations'] = $translations->map(fn ($t) => [
                'id' => $t->id,
                'locale' => $t->locale,
                'state' => $t->state,
            ])->toArray();
        }

        return json_encode($result);
    }

    protected function createEntry($user, Project $project, Collection $collection, Request $request): string
    {
        if (! $user->can('create_content')) {
            return json_encode(['error' => 'You do not have permission to create content.']);
        }

        $locale = trim((string) $request->string('locale')) ?: $project->default_locale;

        // Singleton check
        if ($collection->is_singleton) {
            $existing = ContentEntry::where('project_id', $project->id)
                ->where('collection_id', $collection->id)
                ->where('locale', $locale)
                ->first();

            if ($existing) {
                return json_encode([
                    'error' => "This is a singleton collection. An entry already exists (ID {$existing->id}). Use update_entry instead.",
                ]);
            }
        }

        $fieldsInput = $request['fields'] ?? [];
        $fieldData = $this->parseFieldsInput($fieldsInput);
        $fields = $collection->fields()->orderBy('order')->get();
        $fieldData = $this->mergeDerivedSlugValues($fieldData, $fields);

        // If no field data provided, return the collection structure as a hint
        if (empty($fieldData)) {
            return json_encode([
                'error' => 'No field values provided. Here is the collection structure — pass field values in the "fields" array.',
                'collection' => $collection->name,
                'expected_fields' => $fields->map(fn ($f) => [
                    'name' => $f->name,
                    'type' => $f->type,
                    'label' => $f->label,
                    'required' => ! empty($f->validations['required']['status']),
                ])->toArray(),
            ]);
        }

        $entry = DB::transaction(function () use ($user, $project, $collection, $locale, $fieldData, $fields) {
            $entry = ContentEntry::create([
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'locale' => $locale,
                'state' => 'draft',
                'created_by' => $user->id,
                'updated_by' => $user->id,
            ]);

            $this->saveFields($entry, $fields, $fieldData);

            return $entry;
        });

        ContentEntryWebhookNotifier::dispatch('content.created', $project, $entry, 'cms');

        $fields = $collection->fields()->orderBy('order')->get();

        return json_encode([
            'message' => 'Entry created as draft.',
            'entry' => $this->formatEntry($entry->fresh(), $fields),
            'action' => 'navigate',
            'url' => "/projects/{$project->id}/collections/{$collection->id}",
        ]);
    }

    protected function updateEntry($user, Project $project, Collection $collection, int $entryId, Request $request): string
    {
        if (! $user->can('update_content')) {
            return json_encode(['error' => 'You do not have permission to update content.']);
        }

        if ($entryId <= 0) {
            return json_encode(['error' => 'entry_id is required for update_entry.']);
        }

        $entry = ContentEntry::where('id', $entryId)
            ->where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->first();

        if (! $entry) {
            return json_encode(['error' => "Entry {$entryId} not found."]);
        }

        $fieldsInput = $request['fields'] ?? [];
        $fieldData = $this->parseFieldsInput($fieldsInput);
        $fields = $collection->fields()->orderBy('order')->get();

        DB::transaction(function () use ($user, $entry, $fields, $fieldData) {
            $entry->updated_by = $user->id;
            $entry->save();

            // Preserve existing field data for partial update
            $existingData = $this->extractFieldValues($entry, $fields);
            $mergedData = array_merge($existingData, $fieldData);

            // Preserve existing passwords
            $passwordFields = $fields->where('type', 'password')->pluck('id');
            $existingPasswords = $entry->fieldValues()
                ->whereIn('field_id', $passwordFields)
                ->get()
                ->keyBy('field_id');

            // Delete all and recreate
            $entry->fieldValues()->forceDelete();
            $entry->fieldGroups()->forceDelete();

            // Restore password values if not provided
            foreach ($fields->where('type', 'password') as $pwField) {
                if (empty($mergedData[$pwField->name]) && isset($existingPasswords[$pwField->id])) {
                    $mergedData[$pwField->name] = $existingPasswords[$pwField->id]->text_value;
                }
            }

            $mergedData = $this->mergeDerivedSlugValues($mergedData, $fields);

            $this->saveFields($entry, $fields, $mergedData);
        });

        ContentEntryWebhookNotifier::dispatch('content.updated', $project, $entry, 'cms');

        return json_encode([
            'message' => 'Entry updated.',
            'entry' => $this->formatEntry($entry->fresh(), $fields),
            'action' => 'reload',
        ]);
    }

    protected function publishEntry($user, Project $project, Collection $collection, int $entryId, Request $request): string
    {
        if (! $user->can('update_content')) {
            return json_encode(['error' => 'You do not have permission to update content.']);
        }

        if ($entryId <= 0) {
            return json_encode(['error' => 'entry_id is required for publish_entry.']);
        }

        $entry = ContentEntry::where('id', $entryId)
            ->where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->first();

        if (! $entry) {
            return json_encode(['error' => "Entry {$entryId} not found."]);
        }

        $newState = trim((string) $request->string('state')) ?: 'published';
        if (! in_array($newState, ['draft', 'published'])) {
            $newState = 'published';
        }

        $previousState = $entry->state;

        $entry->state = $newState;
        $entry->updated_by = $user->id;

        if ($newState === 'published' && ! $entry->published_at) {
            $entry->published_at = now();
        }

        $entry->save();

        if ($previousState !== $newState) {
            if ($newState === 'published') {
                ContentEntryWebhookNotifier::dispatch('content.published', $project, $entry, 'cms');
            } elseif ($previousState === 'published' && $newState !== 'published') {
                ContentEntryWebhookNotifier::dispatch('content.unpublished', $project, $entry, 'cms');
            }
        } else {
            ContentEntryWebhookNotifier::dispatch('content.updated', $project, $entry, 'cms');
        }

        return json_encode([
            'message' => $newState === 'published' ? 'Entry published.' : 'Entry unpublished (set to draft).',
            'id' => $entry->id,
            'state' => $entry->state,
            'action' => 'reload',
        ]);
    }

    protected function countEntries(Project $project, Collection $collection, Request $request): string
    {
        $state = trim((string) $request->string('state'));
        $locale = trim((string) $request->string('locale'));

        $query = ContentEntry::where('project_id', $project->id)
            ->where('collection_id', $collection->id);

        if ($state !== '' && in_array($state, ['draft', 'published'])) {
            $query->where('state', $state);
        }

        if ($locale !== '') {
            $query->where('locale', $locale);
        }

        return json_encode([
            'collection' => $collection->name,
            'count' => $query->count(),
            'state_filter' => $state ?: 'all',
            'locale_filter' => $locale ?: 'all',
        ]);
    }

    protected function linkTranslation(Project $project, Collection $collection, int $entryId, int $targetEntryId): string
    {
        if ($entryId <= 0 || $targetEntryId <= 0) {
            return json_encode(['error' => 'Both entry_id and target_entry_id are required for link_translation.']);
        }

        $entry = ContentEntry::where('id', $entryId)
            ->where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->first();

        $target = ContentEntry::where('id', $targetEntryId)
            ->where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->first();

        if (! $entry) {
            return json_encode(['error' => "Entry {$entryId} not found."]);
        }

        if (! $target) {
            return json_encode(['error' => "Target entry {$targetEntryId} not found."]);
        }

        if ($entry->locale === $target->locale) {
            return json_encode(['error' => "Both entries have the same locale (\"{$entry->locale}\"). Translations must be in different locales."]);
        }

        resolve(ContentEntryTranslationService::class)->linkTwoEntries($entry, $target, 'cms');

        $groupId = $entry->fresh()?->translation_group_id;

        return json_encode([
            'message' => 'Entries linked as translations.',
            'translation_group_id' => $groupId,
            'entries' => [
                ['id' => $entry->id, 'locale' => $entry->locale],
                ['id' => $target->id, 'locale' => $target->locale],
            ],
        ]);
    }

    protected function unlinkTranslation(Project $project, Collection $collection, int $entryId): string
    {
        if ($entryId <= 0) {
            return json_encode(['error' => 'entry_id is required for unlink_translation.']);
        }

        $entry = ContentEntry::where('id', $entryId)
            ->where('project_id', $project->id)
            ->where('collection_id', $collection->id)
            ->first();

        if (! $entry) {
            return json_encode(['error' => "Entry {$entryId} not found."]);
        }

        if (! $entry->translation_group_id) {
            return json_encode(['message' => 'Entry is not part of a translation group.']);
        }

        $entry->translation_group_id = null;
        $entry->save();
        $entry->refresh();

        ContentEntryWebhookNotifier::dispatch('content.updated', $project, $entry, 'cms');

        return json_encode([
            'message' => 'Entry removed from translation group.',
            'id' => $entry->id,
        ]);
    }

    // ─── Field Value Parsing ─────────────────────────────────────────

    /**
     * For slug fields configured with options.slug.field, set the slug from that source
     * using the same Str::slug behavior as the translate-AI and CMS flows.
     *
     * @param  \Illuminate\Database\Eloquent\Collection<int, Field>  $fields
     */
    protected function mergeDerivedSlugValues(array $data, $fields): array
    {
        foreach ($fields as $field) {
            if ($field->type !== 'slug') {
                continue;
            }
            $sourceName = $field->options['slug']['field'] ?? null;
            if (! is_string($sourceName) || $sourceName === '') {
                continue;
            }
            $sourceField = $fields->firstWhere('name', $sourceName);
            if (! $sourceField) {
                continue;
            }
            if (! array_key_exists($sourceName, $data)) {
                continue;
            }
            $raw = $data[$sourceName];
            if (! is_string($raw) && ! is_numeric($raw)) {
                continue;
            }
            $rawString = (string) $raw;
            if ($rawString === '') {
                continue;
            }
            $slug = $this->slugFromSourceValue($rawString, $sourceField->type);
            if ($slug !== '') {
                $data[$field->name] = $slug;
            }
        }

        return $data;
    }

    protected function slugFromSourceValue(string $value, string $sourceType): string
    {
        if ($sourceType === 'richtext') {
            $value = strip_tags($value);
        }

        return Str::slug($value);
    }

    /**
     * Parse the fields input array into a name => value map.
     */
    protected function parseFieldsInput(mixed $input): array
    {
        if (! is_array($input) || empty($input)) {
            return [];
        }

        $data = [];
        foreach ($input as $item) {
            if (is_array($item) && isset($item['name'], $item['value'])) {
                $data[trim($item['name'])] = $item['value'];
            }
        }

        return $data;
    }

    /**
     * Save field values for an entry from a flat name => value map.
     */
    protected function saveFields(ContentEntry $entry, $fields, array $data): void
    {
        foreach ($fields as $field) {
            $value = $data[$field->name] ?? null;

            if ($value === null || $value === '') {
                continue;
            }

            if ($field->type === 'group') {
                $groupData = is_string($value) ? json_decode($value, true) : $value;
                if (is_array($groupData)) {
                    $this->saveFieldGroup($entry, $field, $groupData);
                }
            } elseif (! empty($field->options['repeatable']) && is_array($value)) {
                foreach ($value as $item) {
                    $this->saveFieldValue($entry, $field, $item);
                }
            } else {
                $this->saveFieldValue($entry, $field, $value);
            }
        }
    }

    /**
     * Save a single field value using the correct EAV column.
     */
    protected function saveFieldValue(ContentEntry $entry, $field, $value, ?int $groupInstanceId = null): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $fv = new ContentFieldValue([
            'project_id' => $entry->project_id,
            'collection_id' => $entry->collection_id,
            'content_entry_id' => $entry->id,
            'field_id' => $field->id,
            'field_type' => $field->type,
            'group_instance_id' => $groupInstanceId,
        ]);

        switch ($field->type) {
            case 'text':
            case 'longtext':
            case 'slug':
            case 'email':
            case 'color':
            case 'time':
                $fv->text_value = (string) $value;
                break;

            case 'richtext':
                RichTextValue::applyToFieldValue($fv, $field, $value);
                break;

            case 'password':
                if ($value) {
                    $fv->text_value = Hash::make((string) $value);
                }
                break;

            case 'number':
                $fv->number_value = is_numeric($value) ? floatval($value) : 0;
                break;

            case 'enumeration':
                $items = is_array($value) ? $value : array_map('trim', explode(',', (string) $value));
                $fv->json_value = array_values(array_filter($items, fn ($v) => $v !== ''));
                break;

            case 'boolean':
                $fv->boolean_value = in_array(strtolower((string) $value), ['true', '1', 'yes'], true);
                break;

            case 'date':
                $includeTime = ! empty($field->options['includeTime']);
                if ($includeTime) {
                    $fv->datetime_value = $value;
                } else {
                    $fv->date_value = $value;
                }
                break;

            case 'datetime':
                $fv->datetime_value = $value;
                break;

            case 'media':
                $mediaIds = is_array($value)
                    ? $value
                    : array_filter(array_map('intval', explode(',', (string) $value)), fn ($id) => $id > 0);
                $fv->json_value = array_values($mediaIds);
                $fv->save();
                $this->handleMediaRelations($fv, $mediaIds);

                return;

            case 'relation':
                $relationIds = is_array($value)
                    ? $value
                    : array_filter(array_map('intval', explode(',', (string) $value)), fn ($id) => $id > 0);
                $fv->json_value = array_values($relationIds);
                $fv->save();
                $this->handleRelationFields($fv, $relationIds);

                return;

            case 'json':
                $fv->json_value = is_string($value) ? json_decode($value, true) : $value;
                break;

            default:
                $fv->text_value = (string) $value;
                break;
        }

        $fv->save();
    }

    /**
     * Save a group field with its child values.
     */
    protected function saveFieldGroup(ContentEntry $entry, $field, array $groupData): void
    {
        $childFields = $field->children()->orderBy('order')->get();
        if ($childFields->isEmpty()) {
            return;
        }

        $isRepeatable = ! empty($field->options['repeatable']);

        // Normalize: repeatable = array of instances, single = wrap in array
        $instances = $isRepeatable
            ? $groupData
            : (isset($groupData[0]) && is_array($groupData[0]) ? $groupData : [$groupData]);

        foreach ($instances as $sortOrder => $instanceData) {
            if (! is_array($instanceData)) {
                continue;
            }

            $group = ContentFieldGroup::create([
                'project_id' => $entry->project_id,
                'collection_id' => $entry->collection_id,
                'content_entry_id' => $entry->id,
                'field_id' => $field->id,
                'sort_order' => $sortOrder,
            ]);

            foreach ($childFields as $childField) {
                $childValue = $instanceData[$childField->name] ?? null;
                if ($childValue !== null && $childValue !== '') {
                    $this->saveFieldValue($entry, $childField, $childValue, $group->id);
                }
            }
        }
    }

    protected function handleMediaRelations(ContentFieldValue $fv, array $mediaIds): void
    {
        $fv->mediaRelations()->delete();
        foreach ($mediaIds as $id) {
            if (! empty($id) && is_numeric($id)) {
                $fv->mediaRelations()->create(['asset_id' => (int) $id]);
            }
        }
    }

    protected function handleRelationFields(ContentFieldValue $fv, array $relationIds): void
    {
        foreach ($relationIds as $index => $id) {
            if (empty($id)) {
                continue;
            }
            $fv->valueRelations()->create([
                'related_id' => (int) $id,
                'related_type' => ContentEntry::class,
                'sort_order' => $index,
            ]);
        }
    }

    // ─── Field Value Reading ─────────────────────────────────────────

    /**
     * Extract existing field values from an entry into a flat name => value map.
     * Used for partial updates (merge existing with new data).
     */
    protected function extractFieldValues(ContentEntry $entry, $fields): array
    {
        $entry->load([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset',
            'fieldValues.valueRelations.related',
            'fieldGroups.fieldValues.field',
        ]);

        $data = [];

        foreach ($fields as $field) {
            if ($field->type === 'group') {
                $groups = $entry->fieldGroups->where('field_id', $field->id)->sortBy('sort_order');
                if ($groups->isNotEmpty()) {
                    $childFields = $field->children()->orderBy('order')->get();
                    $instances = [];
                    foreach ($groups as $group) {
                        $instance = [];
                        foreach ($childFields as $cf) {
                            $cfv = $group->fieldValues->where('field_id', $cf->id)->first();
                            if ($cfv) {
                                $instance[$cf->name] = $this->readFieldValue($cf, $cfv);
                            }
                        }
                        $instances[] = $instance;
                    }
                    $data[$field->name] = $instances;
                }
            } elseif (! empty($field->options['repeatable'])) {
                $values = $entry->fieldValues->where('field_id', $field->id);
                if ($values->isNotEmpty()) {
                    $data[$field->name] = $values->map(fn ($fv) => $this->readFieldValue($field, $fv))->values()->toArray();
                }
            } else {
                $fv = $entry->fieldValues->where('field_id', $field->id)->first();
                if ($fv) {
                    $data[$field->name] = $this->readFieldValue($field, $fv);
                }
            }
        }

        return $data;
    }

    /**
     * Read a single field value back into a simple representation.
     */
    protected function readFieldValue($field, ContentFieldValue $fv): mixed
    {
        return match ($field->type) {
            'text', 'longtext', 'slug', 'email', 'color', 'time', 'password' => $fv->text_value,
            'richtext' => RichTextValue::forApi($field, $fv),
            'number' => $fv->number_value !== null ? (float) $fv->number_value : null,
            'boolean' => $fv->boolean_value,
            'date' => $fv->date_value?->format('Y-m-d') ?? $fv->datetime_value?->format('Y-m-d H:i:s'),
            'datetime' => $fv->datetime_value?->format('Y-m-d H:i:s'),
            'enumeration' => $fv->json_value,
            'json' => $fv->json_value,
            'media' => $this->readMediaValue($fv),
            'relation' => $this->readRelationValue($fv),
            default => $fv->text_value,
        };
    }

    protected function readMediaValue(ContentFieldValue $fv): array
    {
        $relations = $fv->mediaRelations()->with('asset')->get();
        if ($relations->isEmpty()) {
            return $fv->json_value ?? [];
        }

        return $relations->map(fn ($r) => [
            'id' => $r->asset_id,
            'filename' => $r->asset?->filename ?? $r->asset?->original_filename ?? 'unknown',
        ])->toArray();
    }

    protected function readRelationValue(ContentFieldValue $fv): array
    {
        $relations = $fv->valueRelations()->with('related')->get();
        if ($relations->isEmpty()) {
            return $fv->json_value ?? [];
        }

        return $relations->map(function ($r) {
            $related = $r->related;
            if (! $related) {
                return ['id' => $r->related_id, 'title' => '(deleted)'];
            }

            // Try to get a display value from the first text field
            $displayValue = $related->fieldValues()
                ->whereIn('field_type', ['text', 'slug'])
                ->orderBy('id')
                ->value('text_value');

            return [
                'id' => $related->id,
                'title' => $displayValue ?? "Entry #{$related->id}",
            ];
        })->toArray();
    }

    // ─── Formatting ──────────────────────────────────────────────────

    /**
     * Format an entry for output.
     * When $summarize is true (list view), truncate long field values to save tokens.
     */
    protected function formatEntry(ContentEntry $entry, $fields, bool $detailed = false, bool $summarize = false): array
    {
        $fieldData = $this->extractFieldValues($entry, $fields);

        if ($summarize) {
            $fieldData = $this->truncateFieldValues($fieldData);
        }

        $result = [
            'id' => $entry->id,
            'state' => $entry->state,
            'locale' => $entry->locale,
            'created_at' => $entry->created_at?->format('Y-m-d H:i'),
        ];

        if ($detailed) {
            $result['updated_at'] = $entry->updated_at?->format('Y-m-d H:i');
            $result['published_at'] = $entry->published_at?->format('Y-m-d H:i');
            $result['translation_group_id'] = $entry->translation_group_id;
        }

        $result['fields'] = $fieldData;

        return $result;
    }

    /**
     * Truncate long field values for list views to reduce token usage.
     */
    protected function truncateFieldValues(array $fieldData): array
    {
        foreach ($fieldData as $key => $value) {
            if (is_string($value) && mb_strlen($value) > 200) {
                $fieldData[$key] = mb_substr($value, 0, 200).'...';
            } elseif (is_array($value) && count($value) > 5) {
                // Trim large arrays (e.g., many group instances or relations)
                $fieldData[$key] = array_slice($value, 0, 5);
            }
        }

        return $fieldData;
    }

    // ─── Schema ──────────────────────────────────────────────────────

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'action' => $schema
                ->string()
                ->description('Action: list_entries, get_entry, create_entry, update_entry, publish_entry, count_entries, link_translation, unlink_translation')
                ->required(),
            'project_id' => $schema
                ->integer()
                ->description('Target project ID')
                ->required(),
            'collection' => $schema
                ->string()
                ->description('Collection name, slug, or ID')
                ->required(),
            'entry_id' => $schema
                ->integer()
                ->description('Entry ID for get/update/publish/link/unlink actions'),
            'target_entry_id' => $schema
                ->integer()
                ->description('Target entry ID for link_translation (the other locale entry)'),
            'fields' => $schema
                ->array()
                ->items(
                    $schema->object([
                        'name' => $schema->string()->description('Field name (slug)')->required(),
                        'value' => $schema->string()->description('Field value as string. Numbers: "29.99". Booleans: "true"/"false". Enumerations: "opt1,opt2". Relations: "42" or "42,43". Groups: JSON array of objects.')->required(),
                    ])
                )
                ->description('Field values for create_entry/update_entry'),
            'state' => $schema
                ->string()
                ->description('For list/count: filter by "draft" or "published". For publish_entry: set to "published" or "draft".'),
            'limit' => $schema
                ->integer()
                ->description('Max entries to return for list_entries (default 10, max 50)'),
            'search' => $schema
                ->string()
                ->description('Search text across field values (for list_entries)'),
            'locale' => $schema
                ->string()
                ->description('Locale for the entry (defaults to project default locale)'),
        ];
    }
}
