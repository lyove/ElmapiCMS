<?php

namespace App\Http\Resources;

use App\Models\Asset;
use App\Models\ContentEntry;
use App\Services\RichTextValue;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class ContentEntryResource extends JsonResource
{
    /**
     * Request attribute: int[] of content_entry ids along the current relation branch.
     * Used to break cycles (e.g. self-referential "related posts") before JSON encoding
     * hits maximum stack depth.
     */
    private const RELATION_PATH_ATTRIBUTE = 'elmapi.content_entry_relation_path';

    /**
     * When true, serialize fields from the currently published snapshot instead of
     * the live draft field values on the entry.
     */
    protected bool $fromSnapshot = false;

    public function fromSnapshot(bool $flag = true): self
    {
        $this->fromSnapshot = $flag;

        return $this;
    }

    /**
     * Prefer an explicit fromSnapshot() flag; otherwise honor the request attribute set by list/index.
     */
    private function shouldSerializeFromSnapshot($request): bool
    {
        if ($this->fromSnapshot) {
            return true;
        }

        return (bool) $request->attributes->get('elmapi.content_from_snapshot', false);
    }

    public function toArray($request)
    {
        $entry = $this->resource;
        if (! $entry instanceof ContentEntry) {
            return parent::toArray($request);
        }

        $path = $request->attributes->get(self::RELATION_PATH_ATTRIBUTE, []);
        $entryId = $entry->getKey();

        if ($entryId !== null && in_array($entryId, $path, true)) {
            return $this->cycleStubArray();
        }

        $previousPath = $path;
        if ($entryId !== null) {
            $request->attributes->set(self::RELATION_PATH_ATTRIBUTE, [...$path, $entryId]);
        }

        try {
            $useSnapshot = $this->shouldSerializeFromSnapshot($request);
            $snapshot = $useSnapshot ? $this->snapshotPayload() : null;

            $data = [
                'uuid' => $this->uuid,
                'locale' => $this->locale,
                'published_at' => $this->published_at?->toIso8601String(),
                'fields' => $useSnapshot
                    ? $this->formatFieldsFromSnapshot($snapshot ?? [])
                    : $this->formatFields(),
            ];

            if ($request->has('timestamps')) {
                $data['created_at'] = $this->created_at?->toIso8601String();
                $data['updated_at'] = $this->updated_at?->toIso8601String();
            }

            return $data;
        } finally {
            $request->attributes->set(self::RELATION_PATH_ATTRIBUTE, $previousPath);
        }
    }

    /**
     * @return array{uuid: mixed, locale: mixed, published_at: mixed, fields: array}
     */
    private function cycleStubArray(): array
    {
        return [
            'uuid' => $this->uuid,
            'locale' => $this->locale,
            'published_at' => $this->published_at?->toIso8601String(),
            'fields' => [],
        ];
    }

    /**
     * Nested related entries must inherit snapshot mode so published API output does not
     * fall back to draft field resolution (which would recurse unbounded on cycles).
     */
    private function wrapRelatedContentEntry(ContentEntry $entry): ContentEntryResource
    {
        return (new ContentEntryResource($entry))->fromSnapshot($this->shouldSerializeFromSnapshot(request()));
    }

    /**
     * Eagerly resolve nested resources while the relation path is still valid (see {@see toArray()}).
     *
     * @return array<string, mixed>
     */
    private function relatedEntryArray(ContentEntry $entry): array
    {
        return $this->wrapRelatedContentEntry($entry)->toArray(request());
    }

    private function formatFields(): array
    {
        $fields = [];
        $excludeLookup = $this->excludedFieldLookup();

        $groupFields = [];
        foreach ($this->fieldGroups->sortBy('sort_order') as $group) {
            $field = $group->field;
            if (! $field) {
                continue;
            }

            $fieldName = $field->name;
            if (isset($excludeLookup[$fieldName])) {
                continue;
            }

            if (isset($field->options['hiddenInAPI']) && $field->options['hiddenInAPI']) {
                continue;
            }

            if (! isset($groupFields[$fieldName])) {
                $groupFields[$fieldName] = [];
            }

            $instanceData = [];
            foreach ($group->fieldValues as $fieldValue) {
                $childField = $fieldValue->field;
                if (! $childField) {
                    continue;
                }
                if (isset($excludeLookup[$childField->name])) {
                    continue;
                }

                if (isset($childField->options['hiddenInAPI']) && $childField->options['hiddenInAPI']) {
                    continue;
                }

                if ($childField->type === 'password') {
                    continue;
                }

                $instanceData[$childField->name] = $this->extractValue($fieldValue);
            }

            $groupFields[$fieldName][] = $instanceData;
        }

        foreach ($groupFields as $fieldName => $instances) {
            $firstGroup = $this->fieldGroups->firstWhere('field.name', $fieldName);
            $field = $firstGroup ? $firstGroup->field : null;

            if ($field && isset($field->options['repeatable']) && $field->options['repeatable']) {
                $fields[$fieldName] = $instances;
            } else {
                $fields[$fieldName] = $instances[0] ?? [];
            }
        }

        foreach ($this->fieldValues as $value) {
            if ($value->group_instance_id !== null) {
                continue;
            }

            $fieldName = $value->field->name ?? 'field_'.$value->field_id;
            if (isset($excludeLookup[$fieldName])) {
                continue;
            }

            if ($value->field && isset($value->field->options['hiddenInAPI']) && $value->field->options['hiddenInAPI']) {
                continue;
            }

            if ($value->field && $value->field->type === 'password') {
                continue;
            }

            $isRepeatable = false;
            if ($value->field && isset($value->field->options['repeatable'])) {
                $isRepeatable = (bool) $value->field->options['repeatable'];
            }

            $val = $this->extractValue($value);

            if ($isRepeatable) {
                if (! isset($fields[$fieldName])) {
                    $fields[$fieldName] = [];
                }
                $fields[$fieldName][] = $val;
            } else {
                $fields[$fieldName] = $val;
            }
        }

        return $fields;
    }

    /**
     * Build the output `fields` object from a published version snapshot.
     *
     * @param  array{fields?: array<string, mixed>, meta?: array<string, mixed>}  $snapshot
     */
    private function formatFieldsFromSnapshot(array $snapshot): array
    {
        $data = $snapshot['fields'] ?? [];
        if (! is_array($data) || empty($data)) {
            return [];
        }

        $excludeLookup = $this->excludedFieldLookup();

        $collection = $this->resource->collection;
        if ($collection && ! $collection->relationLoaded('fields')) {
            $collection->load('fields.children');
        }
        $collectionFields = $collection?->fields ?? collect();

        $output = [];
        foreach ($data as $fieldName => $value) {
            if (isset($excludeLookup[$fieldName])) {
                continue;
            }

            $field = $collectionFields->firstWhere('name', $fieldName);
            if (! $field) {
                continue;
            }

            if (isset($field->options['hiddenInAPI']) && $field->options['hiddenInAPI']) {
                continue;
            }

            if ($field->type === 'password') {
                continue;
            }

            $output[$fieldName] = $this->transformSnapshotValue($field, $value, $excludeLookup);
        }

        return $output;
    }

    private function transformSnapshotValue($field, $value, array $excludeLookup)
    {
        if ($field->type === 'group') {
            if (! $field->relationLoaded('children')) {
                $field->load('children');
            }
            $children = $field->children ?? collect();
            $isRepeatable = (bool) ($field->options['repeatable'] ?? false);

            $transform = function ($instance) use ($children, $excludeLookup) {
                if (! is_array($instance)) {
                    return [];
                }
                $out = [];
                foreach ($children as $child) {
                    if (isset($excludeLookup[$child->name])) {
                        continue;
                    }
                    if (isset($child->options['hiddenInAPI']) && $child->options['hiddenInAPI']) {
                        continue;
                    }
                    if ($child->type === 'password') {
                        continue;
                    }
                    if (! array_key_exists($child->name, $instance)) {
                        continue;
                    }
                    $out[$child->name] = $this->transformSnapshotScalar($child, $instance[$child->name]);
                }

                return $out;
            };

            if ($isRepeatable) {
                return array_map($transform, is_array($value) ? array_values($value) : []);
            }

            return $transform(is_array($value) ? $value : []);
        }

        $isRepeatable = (bool) ($field->options['repeatable'] ?? false);
        if ($isRepeatable) {
            return array_map(
                fn ($v) => $this->transformSnapshotScalar($field, $v),
                is_array($value) ? array_values($value) : []
            );
        }

        return $this->transformSnapshotScalar($field, $value);
    }

    private function transformSnapshotScalar($field, $value)
    {
        if ($value === null) {
            return null;
        }

        if ($field->type === 'media') {
            $ids = collect(is_array($value) ? $value : [$value])
                ->map(fn ($v) => is_array($v) ? ($v['id'] ?? null) : (is_numeric($v) ? (int) $v : null))
                ->filter()
                ->values();

            if ($ids->isEmpty()) {
                return AssetResource::collection(collect());
            }

            $assets = Asset::query()
                ->whereIn('id', $ids)
                ->with('metadata')
                ->get()
                ->keyBy('id');

            $ordered = $ids->map(fn ($id) => $assets->get($id))->filter()->values();

            return AssetResource::collection($ordered);
        }

        if ($field->type === 'relation') {
            $ids = collect(is_array($value) ? $value : [$value])
                ->map(fn ($v) => is_array($v) ? ($v['id'] ?? null) : (is_numeric($v) ? (int) $v : null))
                ->filter()
                ->values();

            if ($ids->isEmpty()) {
                return null;
            }

            $with = $this->shouldSerializeFromSnapshot(request())
                ? [
                    'publishedVersion',
                    'collection.fields' => function ($q) {
                        $q->orderBy('order');
                    },
                    'collection.fields.children' => function ($q) {
                        $q->orderBy('order');
                    },
                ]
                : [
                    'fieldValues.field',
                    'fieldValues.mediaRelations.asset.metadata',
                    'fieldValues.valueRelations.related',
                    'fieldGroups.field',
                    'fieldGroups.fieldValues.field',
                    'fieldGroups.fieldValues.mediaRelations.asset.metadata',
                    'fieldGroups.fieldValues.valueRelations.related',
                ];

            $entries = ContentEntry::query()
                ->whereIn('id', $ids)
                ->with($with)
                ->get()
                ->keyBy('id');

            $ordered = $ids->map(fn ($id) => $entries->get($id))->filter()->values();

            if ($ordered->isEmpty()) {
                return null;
            }

            $isMultiple = isset($field->options['relation']['type']) && $field->options['relation']['type'] == 2;

            if ($isMultiple) {
                return $ordered
                    ->map(fn (ContentEntry $e) => $this->relatedEntryArray($e))
                    ->all();
            }

            return $this->relatedEntryArray($ordered->first());
        }

        if ($field->type === 'richtext') {
            $outputFormat = $field->options['editor']['outputFormat'] ?? 'html';
            $isMarkdown = ($field->options['editor']['mode'] ?? 'lexical') === 'markdown';
            $raw = (string) ($value ?? '');

            if ($isMarkdown && $outputFormat !== 'markdown') {
                return Str::markdown($raw, [
                    'html_input' => 'strip',
                    'allow_unsafe_links' => false,
                ]);
            }

            return $raw;
        }

        if ($field->type === 'date') {
            $isRange = ($field->options['mode'] ?? null) === 'range';

            if ($isRange) {
                if (is_array($value)) {
                    return [
                        'start' => $value['start'] ?? null,
                        'end' => $value['end'] ?? null,
                    ];
                }

                return ['start' => $value, 'end' => null];
            }

            return is_array($value) ? ($value['start'] ?? null) : $value;
        }

        if ($field->type === 'boolean') {
            return (bool) $value;
        }

        if ($field->type === 'number') {
            return is_numeric($value) ? 0 + $value : $value;
        }

        return $value;
    }

    /**
     * Retrieve the published snapshot payload for this entry, if any.
     */
    protected function snapshotPayload(): ?array
    {
        if (! $this->resource) {
            return null;
        }

        if (! $this->resource->published_version_id) {
            return null;
        }

        if (! $this->resource->relationLoaded('publishedVersion')) {
            $this->resource->load('publishedVersion');
        }

        $snapshot = $this->resource->publishedVersion?->snapshot;

        return is_array($snapshot) ? $snapshot : null;
    }

    private function excludedFieldLookup(): array
    {
        $excludeFields = request()->query('exclude');
        if (! $excludeFields) {
            return [];
        }

        $excludeArray = is_array($excludeFields) ? $excludeFields : explode(',', (string) $excludeFields);
        $excludeArray = array_values(array_filter(array_map('trim', $excludeArray), fn ($field) => $field !== ''));

        return array_fill_keys($excludeArray, true);
    }

    private function extractValue($value)
    {
        $field = $value->field;

        if ($field && $field->type === 'media') {
            $assets = $value->mediaRelations
                ->sortBy('sort_order')
                ->pluck('asset')
                ->filter()
                ->values();

            return AssetResource::collection($assets);
        }

        if ($field && $field->type === 'date') {
            $isRange = isset($field->options['mode']) && $field->options['mode'] === 'range';
            $includeTime = isset($field->options['includeTime']) && $field->options['includeTime'];

            if ($isRange) {
                $start = $includeTime ? $value->datetime_value : $value->date_value;
                $end = $includeTime ? $value->datetime_value_end : $value->date_value_end;

                return [
                    'start' => $start ? $start : null,
                    'end' => $end ? $end : null,
                ];
            } else {
                $single = $includeTime ? $value->datetime_value : $value->date_value;

                return $single ? $single : null;
            }
        }

        if ($field && $field->type === 'relation') {
            $relatedEntries = $value->valueRelations
                ->sortBy('sort_order')
                ->pluck('related')
                ->filter()
                ->values();

            if ($relatedEntries->isEmpty()) {
                return null;
            }

            $isMultiple = isset($field->options['relation']['type']) && $field->options['relation']['type'] == 2;

            if ($isMultiple) {
                return $relatedEntries
                    ->map(fn (ContentEntry $e) => $this->relatedEntryArray($e))
                    ->all();
            }

            return $this->relatedEntryArray($relatedEntries->first());
        }

        if ($field && $field->type === 'richtext') {
            return RichTextValue::forApi($field, $value);
        }

        return $value->text_value
            ?? $value->number_value
            ?? $value->boolean_value
            ?? $value->date_value
            ?? $value->datetime_value
            ?? $value->json_value
            ?? null;
    }
}
