<?php

namespace App\Services;

use App\Events\ContentEvent;
use App\Models\Asset;
use App\Models\ContentEntry;
use App\Models\ContentEntryVersion;
use App\Models\ContentFieldGroup;
use App\Models\ContentFieldValue;
use Illuminate\Support\Facades\DB;

/**
 * Produces, publishes, reverts, and prunes immutable content entry snapshots.
 *
 * The snapshot schema is designed to be both restorable and self-contained for
 * API reads:
 * {
 *   "fields": { "<field-name>": <value>, ... },
 *   "meta": { "locale": "en", "translation_group_id": "..." }
 * }
 */
class ContentEntryVersioningService
{
    /**
     * Capture the current draft state of an entry into a normalized snapshot.
     *
     * @return array{fields: array<string, mixed>, meta: array<string, mixed>}
     */
    public function snapshot(ContentEntry $entry): array
    {
        $entry->loadMissing([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset',
            'fieldValues.valueRelations.related',
            'fieldGroups.field',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset',
            'fieldGroups.fieldValues.valueRelations.related',
        ]);

        $fields = [];

        foreach ($entry->fieldGroups->sortBy('sort_order') as $group) {
            $field = $group->field;
            if (! $field) {
                continue;
            }

            $instanceData = [];
            foreach ($group->fieldValues as $childValue) {
                $childField = $childValue->field;
                if (! $childField) {
                    continue;
                }
                $instanceData[$childField->name] = $this->extractRawValue($childValue, $childField);
            }

            $isRepeatable = (bool) ($field->options['repeatable'] ?? false);
            if ($isRepeatable) {
                $fields[$field->name] ??= [];
                $fields[$field->name][] = $instanceData;
            } else {
                $fields[$field->name] = $instanceData;
            }
        }

        foreach ($entry->fieldValues as $value) {
            if ($value->group_instance_id !== null) {
                continue;
            }

            $field = $value->field;
            if (! $field) {
                continue;
            }

            $isRepeatable = (bool) ($field->options['repeatable'] ?? false);
            $raw = $this->extractRawValue($value, $field);

            if ($isRepeatable) {
                $fields[$field->name] ??= [];
                $fields[$field->name][] = $raw;
            } else {
                $fields[$field->name] = $raw;
            }
        }

        return [
            'fields' => $fields,
            'meta' => [
                'locale' => $entry->locale,
                'translation_group_id' => $entry->translation_group_id,
            ],
        ];
    }

    /**
     * Publish the working draft: mint a new version, update pointers, and
     * dispatch the "content.published" event.
     */
    public function publish(ContentEntry $entry, ?string $label = null, ?string $description = null, ?int $userId = null): ContentEntryVersion
    {
        $userId = $userId ?? auth()->id();

        $version = DB::transaction(function () use ($entry, $label, $description, $userId) {
            $snapshot = $this->snapshot($entry);
            $nextNumber = $entry->latestVersionNumber() + 1;

            /** @var ContentEntryVersion $version */
            $version = ContentEntryVersion::create([
                'content_entry_id' => $entry->id,
                'project_id' => $entry->project_id,
                'collection_id' => $entry->collection_id,
                'locale' => $entry->locale,
                'translation_group_id' => $entry->translation_group_id,
                'version_number' => $nextNumber,
                'label' => $label,
                'description' => $description,
                'snapshot' => $snapshot,
                'published_at' => now(),
                'created_by' => $userId,
            ]);

            $entry->state = 'published';
            $entry->published_version_id = $version->id;
            $entry->published_version_number = $version->version_number;
            $entry->is_draft_dirty = false;
            if (! $entry->published_at) {
                $entry->published_at = $version->published_at;
            }
            if ($userId) {
                $entry->updated_by = $userId;
            }
            $entry->save();

            return $version;
        });

        $entry->loadMissing([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
            'project',
        ]);

        event(new ContentEvent('content.published', $entry->project, $entry));

        $this->enforceRetention($entry);

        return $version->fresh();
    }

    /**
     * Mint a published version for each entry that is marked published but has no
     * {@see ContentEntry::$published_version_id} (e.g. after project/collection JSON import).
     *
     * @param  array<int>  $contentEntryIds
     */
    public function publishEntriesMissingVersion(array $contentEntryIds, ?int $userId = null): void
    {
        $userId = $userId ?? auth()->id();

        foreach (array_unique($contentEntryIds) as $id) {
            $entry = ContentEntry::query()->find($id);
            if (! $entry || $entry->state !== 'published' || $entry->hasPublishedVersion()) {
                continue;
            }
            $this->publish($entry, null, null, $userId);
        }
    }

    /**
     * Unpublish the entry: clear published pointers and dispatch the
     * "content.unpublished" event. Versions are retained.
     */
    public function unpublish(ContentEntry $entry, ?int $userId = null): void
    {
        $userId = $userId ?? auth()->id();

        $wasPublished = $entry->hasPublishedVersion() || $entry->state === 'published';

        $entry->state = 'draft';
        $entry->published_version_id = null;
        $entry->published_version_number = null;
        if ($userId) {
            $entry->updated_by = $userId;
        }
        $entry->save();

        if (! $wasPublished) {
            return;
        }

        $entry->loadMissing([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.fieldValues.field',
            'project',
        ]);

        event(new ContentEvent('content.unpublished', $entry->project, $entry));
    }

    /**
     * Reset the working draft to match the currently published snapshot without
     * minting a new version. No-op if there is no published pointer or the
     * draft is already clean.
     */
    public function discardUnpublishedChanges(ContentEntry $entry, ?int $userId = null): void
    {
        if (! $entry->published_version_id || ! $entry->is_draft_dirty) {
            return;
        }

        $userId = $userId ?? auth()->id();

        /** @var ContentEntryVersion|null $published */
        $published = $entry->publishedVersion()->first();
        if (! $published) {
            return;
        }

        DB::transaction(function () use ($entry, $published, $userId) {
            $this->applySnapshotToEntry($entry, $published->snapshot ?? []);
            $entry->is_draft_dirty = false;
            if ($userId) {
                $entry->updated_by = $userId;
            }
            $entry->save();
        });
    }

    /**
     * Revert the working draft to a previous version and publish a new version
     * on top of it (minting version N+1).
     */
    public function revert(ContentEntry $entry, int $versionNumber, ?int $userId = null): ContentEntryVersion
    {
        /** @var ContentEntryVersion $target */
        $target = $entry->versions()
            ->where('version_number', $versionNumber)
            ->firstOrFail();

        DB::transaction(function () use ($entry, $target) {
            $this->applySnapshotToEntry($entry, $target->snapshot ?? []);
            $entry->is_draft_dirty = true;
            $entry->save();
        });

        $label = $target->label
            ? "Revert to v{$target->version_number} ({$target->label})"
            : "Revert to v{$target->version_number}";

        return $this->publish($entry->fresh(), $label, null, $userId);
    }

    /**
     * Restore live field rows from the given snapshot. Existing field values
     * and field groups are force-deleted first so the write is idempotent.
     *
     * @param  array{fields?: array<string, mixed>, meta?: array<string, mixed>}  $snapshot
     */
    public function applySnapshotToEntry(ContentEntry $entry, array $snapshot): void
    {
        $entry->fieldValues()->forceDelete();
        $entry->fieldGroups()->forceDelete();

        $fields = $snapshot['fields'] ?? [];

        $collection = $entry->collection()->with('fields.children')->first();
        if (! $collection) {
            return;
        }

        foreach ($fields as $fieldName => $value) {
            $field = $collection->fields->firstWhere('name', $fieldName);
            if (! $field) {
                continue;
            }

            if ($field->type === 'group') {
                $this->writeGroupField($entry, $field, $value);

                continue;
            }

            $isRepeatable = (bool) ($field->options['repeatable'] ?? false);

            if ($isRepeatable && is_array($value)) {
                foreach ($value as $item) {
                    $this->writeFieldValue($entry, $field, $item, null);
                }

                continue;
            }

            $this->writeFieldValue($entry, $field, $value, null);
        }
    }

    /**
     * Enforce the configured version retention cap for this entry, preserving
     * the currently published version. A negative cap keeps all history.
     */
    public function enforceRetention(ContentEntry $entry): void
    {
        $cap = $this->retentionCap();

        if ($cap < 0) {
            return;
        }

        $versions = $entry->versions()
            ->orderByDesc('version_number')
            ->get(['id', 'version_number']);

        if ($versions->count() <= $cap) {
            return;
        }

        $keepIds = $versions->take($cap)->pluck('id')->all();

        if ($entry->published_version_id && ! in_array($entry->published_version_id, $keepIds, true)) {
            $keepIds[] = $entry->published_version_id;
        }

        $entry->versions()
            ->whereNotIn('id', $keepIds)
            ->delete();
    }

    public function retentionCap(): int
    {
        return (int) config('content.versions_per_entry', -1);
    }

    /**
     * Extract a raw (restorable) value from a ContentFieldValue row.
     */
    protected function extractRawValue(ContentFieldValue $fv, $field): mixed
    {
        switch ($field->type) {
            case 'number':
                return $fv->number_value !== null ? (float) $fv->number_value : null;
            case 'boolean':
                return $fv->boolean_value === null ? null : (bool) $fv->boolean_value;
            case 'date':
                $isRange = ($field->options['mode'] ?? null) === 'range';
                $includeTime = (bool) ($field->options['includeTime'] ?? false);
                if ($isRange) {
                    $start = $includeTime ? $fv->datetime_value : $fv->date_value;
                    $end = $includeTime ? $fv->datetime_value_end : $fv->date_value_end;

                    return [
                        'start' => $start?->toDateTimeString(),
                        'end' => $end?->toDateTimeString(),
                    ];
                }
                $single = $includeTime ? $fv->datetime_value : $fv->date_value;

                return $single?->toDateTimeString();
            case 'time':
                return $fv->text_value;
            case 'json':
                return $fv->json_value;
            case 'enumeration':
                return $fv->json_value;
            case 'media':
                return $fv->mediaRelations
                    ->sortBy('sort_order')
                    ->map(fn ($rel) => $rel->asset ? ['id' => $rel->asset->id, 'uuid' => $rel->asset->uuid] : null)
                    ->filter()
                    ->values()
                    ->all();
            case 'relation':
                return $fv->valueRelations
                    ->sortBy('sort_order')
                    ->map(fn ($rel) => $rel->related ? ['id' => $rel->related->id, 'uuid' => $rel->related->uuid] : null)
                    ->filter()
                    ->values()
                    ->all();
            case 'richtext':
                return $fv->text_value;
            default:
                return $fv->text_value;
        }
    }

    protected function writeGroupField(ContentEntry $entry, $field, $value): void
    {
        if (! $field->relationLoaded('children')) {
            $field->load('children');
        }

        $isRepeatable = (bool) ($field->options['repeatable'] ?? false);

        if ($isRepeatable) {
            $instances = is_array($value) ? $value : [];
        } else {
            $instances = is_array($value) && ! empty($value) ? [$value] : [];
        }

        foreach ($instances as $sortOrder => $instanceData) {
            if (! is_array($instanceData)) {
                continue;
            }

            $groupInstance = ContentFieldGroup::create([
                'project_id' => $entry->project_id,
                'collection_id' => $entry->collection_id,
                'content_entry_id' => $entry->id,
                'field_id' => $field->id,
                'sort_order' => $sortOrder,
            ]);

            foreach ($field->children as $child) {
                if (! array_key_exists($child->name, $instanceData)) {
                    continue;
                }

                $this->writeFieldValue($entry, $child, $instanceData[$child->name], $groupInstance->id);
            }
        }
    }

    protected function writeFieldValue(ContentEntry $entry, $field, $value, ?int $groupInstanceId): void
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
            case 'number':
                $fv->number_value = $value;
                break;
            case 'boolean':
                $fv->boolean_value = (bool) $value;
                break;
            case 'date':
                $isRange = ($field->options['mode'] ?? null) === 'range';
                $includeTime = (bool) ($field->options['includeTime'] ?? false);
                if ($isRange && is_array($value)) {
                    $start = $value['start'] ?? null;
                    $end = $value['end'] ?? null;
                    if ($includeTime) {
                        $fv->datetime_value = $start;
                        $fv->datetime_value_end = $end;
                    } else {
                        $fv->date_value = $start;
                        $fv->date_value_end = $end;
                    }
                } else {
                    if ($includeTime) {
                        $fv->datetime_value = is_array($value) ? ($value['start'] ?? null) : $value;
                    } else {
                        $fv->date_value = is_array($value) ? ($value['start'] ?? null) : $value;
                    }
                }
                break;
            case 'json':
                $fv->json_value = is_array($value) ? $value : [$value];
                break;
            case 'enumeration':
                $fv->json_value = is_array($value) ? $value : [$value];
                break;
            case 'media':
                $ids = $this->resolveMediaIds($entry, $value);
                $fv->json_value = $ids;
                $fv->save();
                foreach ($ids as $idx => $assetId) {
                    $fv->mediaRelations()->create([
                        'asset_id' => $assetId,
                        'sort_order' => $idx,
                    ]);
                }

                return;
            case 'relation':
                $ids = $this->resolveRelationIds($entry, $value);
                $fv->json_value = $ids;
                $fv->save();
                foreach ($ids as $idx => $relatedId) {
                    $fv->valueRelations()->create([
                        'related_id' => $relatedId,
                        'related_type' => ContentEntry::class,
                        'sort_order' => $idx,
                    ]);
                }

                return;
            case 'richtext':
                $fv->text_value = (string) $value;
                break;
            default:
                $fv->text_value = is_scalar($value) ? (string) $value : null;
        }

        $fv->save();
    }

    /**
     * @return array<int, int>
     */
    protected function resolveMediaIds(ContentEntry $entry, mixed $value): array
    {
        $items = is_array($value) ? $value : [$value];
        $ids = [];

        foreach ($items as $item) {
            if (is_array($item)) {
                if (isset($item['id'])) {
                    $ids[] = (int) $item['id'];

                    continue;
                }
                if (isset($item['uuid'])) {
                    $asset = Asset::query()
                        ->where('project_id', $entry->project_id)
                        ->where('uuid', $item['uuid'])
                        ->first();
                    if ($asset) {
                        $ids[] = $asset->id;
                    }

                    continue;
                }
            } elseif (is_numeric($item)) {
                $ids[] = (int) $item;
            } elseif (is_string($item)) {
                $asset = Asset::query()
                    ->where('project_id', $entry->project_id)
                    ->where('uuid', $item)
                    ->first();
                if ($asset) {
                    $ids[] = $asset->id;
                }
            }
        }

        return array_values(array_unique(array_filter($ids, fn ($id) => $id > 0)));
    }

    /**
     * @return array<int, int>
     */
    protected function resolveRelationIds(ContentEntry $entry, mixed $value): array
    {
        $items = is_array($value) ? $value : [$value];
        $ids = [];

        foreach ($items as $item) {
            if (is_array($item)) {
                if (isset($item['id'])) {
                    $ids[] = (int) $item['id'];

                    continue;
                }
                if (isset($item['uuid'])) {
                    $related = ContentEntry::query()
                        ->where('project_id', $entry->project_id)
                        ->where('uuid', $item['uuid'])
                        ->first();
                    if ($related) {
                        $ids[] = $related->id;
                    }

                    continue;
                }
            } elseif (is_numeric($item)) {
                $ids[] = (int) $item;
            } elseif (is_string($item)) {
                $related = ContentEntry::query()
                    ->where('project_id', $entry->project_id)
                    ->where('uuid', $item)
                    ->first();
                if ($related) {
                    $ids[] = $related->id;
                }
            }
        }

        return array_values(array_unique(array_filter($ids, fn ($id) => $id > 0)));
    }
}
