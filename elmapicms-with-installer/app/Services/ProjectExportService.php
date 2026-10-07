<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\Field;
use App\Models\Project;
use Illuminate\Support\Str;
use InvalidArgumentException;

class ProjectExportService
{
    public const FORMAT = 'elmapicms';

    public const VERSION = 1;

    /**
     * Export project structure with optional collections and content.
     *
     * @return array<string, mixed>
     */
    public static function export(
        Project $project,
        bool $includeCollections = true,
        bool $includeContent = false,
        string $assetScope = 'none'
    ): array {
        self::validateAssetScope($assetScope, $includeCollections && $includeContent);
        $referencedAssets = [];

        $exportData = [
            'format' => self::FORMAT,
            'version' => self::VERSION,
            'type' => 'project',
            'asset_scope' => $assetScope,
            'name' => $project->name,
            'description' => $project->description,
            'default_locale' => $project->default_locale,
            'locales' => $project->locales,
            'public_api' => $project->public_api,
        ];

        if ($includeCollections) {
            $project->load(['collections.fields']);
            $collectionSlugById = $project->collections->pluck('slug', 'id');

            $exportData['collections'] = [];

            foreach ($project->collections as $collection) {
                $collArr = [
                    'name' => $collection->name,
                    'slug' => $collection->slug,
                    'is_singleton' => (bool) $collection->is_singleton,
                    'fields' => [],
                ];

                foreach ($collection->fields as $field) {
                    $opts = $field->options ?? [];
                    // For relation fields convert internal collection id into slug reference
                    if ($field->type === 'relation' && isset($opts['relation']['collection'])) {
                        $targetId = $opts['relation']['collection'];
                        $opts['relation']['collection'] = $collectionSlugById[$targetId] ?? $targetId;
                    }

                    $fieldData = [
                        'type' => $field->type,
                        'label' => $field->label,
                        'name' => $field->name,
                        'description' => $field->description,
                        'placeholder' => $field->placeholder,
                        'options' => $opts,
                        'validations' => $field->validations ?? [],
                    ];

                    // Include children for group fields
                    if ($field->type === 'group') {
                        $children = $field->children()->orderBy('order')->get();
                        if ($children->isNotEmpty()) {
                            $fieldData['children'] = $children->map(function ($child) {
                                return [
                                    'type' => $child->type,
                                    'label' => $child->label,
                                    'name' => $child->name,
                                    'description' => $child->description,
                                    'placeholder' => $child->placeholder,
                                    'options' => $child->options ?? [],
                                    'validations' => $child->validations ?? [],
                                ];
                            })->toArray();
                        }
                    }

                    $collArr['fields'][] = $fieldData;
                }

                $exportData['collections'][] = $collArr;
            }

            if ($includeContent) {
                $exportData['demo_data'] = self::exportContent($project, $referencedAssets);
            }
        }

        $exportData['assets'] = $assetScope === 'all'
            ? self::assetManifest($project->assets()->with('metadata')->orderBy('id')->get()->all())
            : $referencedAssets;

        return $exportData;
    }

    /**
     * Export a single collection structure with optional content.
     *
     * @return array<string, mixed>
     */
    public static function exportCollection(
        Collection $collection,
        bool $includeContent = false,
        string $assetScope = 'none'
    ): array {
        self::validateAssetScope($assetScope, $includeContent);
        $referencedAssets = [];
        $collection->load(['fields']);
        $project = $collection->project;
        $project->load(['collections']);
        $collectionSlugById = $project->collections->pluck('slug', 'id');

        $exportData = [
            'format' => self::FORMAT,
            'version' => self::VERSION,
            'type' => 'collection',
            'asset_scope' => $assetScope,
            'name' => $collection->name,
            'slug' => $collection->slug,
            'is_singleton' => (bool) $collection->is_singleton,
            'fields' => [],
        ];

        foreach ($collection->fields as $field) {
            $opts = $field->options ?? [];
            // For relation fields convert internal collection id into slug reference
            if ($field->type === 'relation' && isset($opts['relation']['collection'])) {
                $targetId = $opts['relation']['collection'];
                $opts['relation']['collection'] = $collectionSlugById[$targetId] ?? $targetId;
            }

            $fieldData = [
                'type' => $field->type,
                'label' => $field->label,
                'name' => $field->name,
                'description' => $field->description,
                'placeholder' => $field->placeholder,
                'options' => $opts,
                'validations' => $field->validations ?? [],
            ];

            // Include children for group fields
            if ($field->type === 'group') {
                $children = $field->children()->orderBy('order')->get();
                if ($children->isNotEmpty()) {
                    $fieldData['children'] = $children->map(function ($child) {
                        return [
                            'type' => $child->type,
                            'label' => $child->label,
                            'name' => $child->name,
                            'description' => $child->description,
                            'placeholder' => $child->placeholder,
                            'options' => $child->options ?? [],
                            'validations' => $child->validations ?? [],
                        ];
                    })->toArray();
                }
            }

            $exportData['fields'][] = $fieldData;
        }

        // Include content if requested
        if ($includeContent) {
            $exportData['demo_data'] = self::exportCollectionContent($collection, $referencedAssets);
        }

        $exportData['assets'] = $assetScope === 'all'
            ? self::assetManifest($project->assets()->with('metadata')->orderBy('id')->get()->all())
            : $referencedAssets;

        return $exportData;
    }

    /**
     * Export content for a single collection.
     *
     * @param  array<string, array<string, mixed>>  $referencedAssets
     */
    protected static function exportCollectionContent(Collection $collection, array &$referencedAssets): array
    {
        $collection->load([
            'contentEntries.fieldValues.field',
            'contentEntries.fieldValues.mediaRelations',
            'contentEntries.fieldValues.valueRelations',
            'contentEntries.publishedVersion',
            'project.collections',
        ]);

        $project = $collection->project;
        $tempCounter = 1;
        $uuidToTempId = [];

        // Assign temp ids for each entry
        foreach ($collection->contentEntries()->where('state', 'published')->get() as $e) {
            if (! isset($uuidToTempId[$e->uuid])) {
                $uuidToTempId[$e->uuid] = 'e'.$tempCounter++;
            }
        }

        // Also get temp ids for related entries in other collections
        foreach ($project->collections as $c) {
            foreach ($c->contentEntries()->where('state', 'published')->get() as $e) {
                if (! isset($uuidToTempId[$e->uuid])) {
                    $uuidToTempId[$e->uuid] = 'e'.$tempCounter++;
                }
            }
        }

        $entriesArr = [];
        foreach ($collection->contentEntries()->where('state', 'published')->get() as $entry) {
            $tempId = $uuidToTempId[$entry->uuid];

            $entryArr = [
                'id' => $tempId,
                'locale' => $entry->locale,
                'state' => $entry->state,
                'translation_group_id' => $entry->translation_group_id,
                'fields' => self::buildDemoFieldsForEntry($entry, $uuidToTempId, $referencedAssets),
            ];

            $entriesArr[] = $entryArr;
        }

        return [
            [
                'collection' => $collection->slug,
                'entries' => $entriesArr,
            ],
        ];
    }

    /**
     * Export content entries similar to ProjectTemplateBuilder.
     *
     * @param  array<string, array<string, mixed>>  $referencedAssets
     */
    protected static function exportContent(Project $project, array &$referencedAssets): array
    {
        $project->load([
            'collections.contentEntries.fieldValues.field',
            'collections.contentEntries.fieldValues.mediaRelations',
            'collections.contentEntries.fieldValues.valueRelations',
            'collections.contentEntries.publishedVersion',
        ]);

        $tempCounter = 1;
        $uuidToTempId = [];

        // Assign temp ids for each entry
        foreach ($project->collections as $c) {
            foreach ($c->contentEntries()->where('state', 'published')->get() as $e) {
                if (! isset($uuidToTempId[$e->uuid])) {
                    $uuidToTempId[$e->uuid] = 'e'.$tempCounter++;
                }
            }
        }

        $demoData = [];
        foreach ($project->collections as $collection) {
            $entriesArr = [];
            foreach ($collection->contentEntries()->where('state', 'published')->get() as $entry) {
                $tempId = $uuidToTempId[$entry->uuid];

                $entryArr = [
                    'id' => $tempId,
                    'locale' => $entry->locale,
                    'state' => $entry->state,
                    'translation_group_id' => $entry->translation_group_id,
                    'fields' => self::buildDemoFieldsForEntry($entry, $uuidToTempId, $referencedAssets),
                ];

                $entriesArr[] = $entryArr;
            }

            if (! empty($entriesArr)) {
                $demoData[] = [
                    'collection' => $collection->slug,
                    'entries' => $entriesArr,
                ];
            }
        }

        return $demoData;
    }

    /**
     * Build demo_data "fields" for an entry: prefer the immutable published snapshot
     * (what the Content API returns) and fall back to live field values.
     *
     * @param  array<string, array<string, mixed>>|null  $referencedAssets
     * @return array<string, mixed>
     */
    public static function buildDemoFieldsForEntry(
        ContentEntry $entry,
        array $uuidToTempId,
        ?array &$referencedAssets = null
    ): array {
        $referencedAssets ??= [];
        $entry->loadMissing(['publishedVersion', 'fieldValues.field', 'fieldValues.mediaRelations', 'fieldValues.valueRelations', 'collection.fields.children']);

        if ($entry->published_version_id && $entry->publishedVersion) {
            $snap = $entry->publishedVersion->snapshot;
            if (is_array($snap) && isset($snap['fields']) && is_array($snap['fields']) && $snap['fields'] !== []) {
                $mapped = self::mapSnapshotFieldsToExport($snap['fields'], $entry, $uuidToTempId, $referencedAssets);
                if ($mapped !== []) {
                    return $mapped;
                }
            }
        }

        return self::exportFieldsFromLiveFieldValues($entry, $uuidToTempId, $referencedAssets);
    }

    /**
     * @param  array<string, mixed>  $snapshotFields
     * @param  array<string, array<string, mixed>>  $referencedAssets
     * @return array<string, mixed>
     */
    protected static function mapSnapshotFieldsToExport(
        array $snapshotFields,
        ContentEntry $entry,
        array $uuidToTempId,
        array &$referencedAssets
    ): array {
        $collection = $entry->collection;
        if (! $collection) {
            return [];
        }

        $collection->loadMissing('fields.children');
        $entry->project->loadMissing('assets.metadata');
        $out = [];

        foreach ($snapshotFields as $fieldName => $value) {
            $field = $collection->fields->firstWhere('name', $fieldName);
            if (! $field) {
                continue;
            }
            if (isset($field->options['hiddenInAPI']) && $field->options['hiddenInAPI']) {
                continue;
            }
            if ($field->type === 'password') {
                continue;
            }

            $mapped = self::mapSnapshotFieldValueForExport(
                $value,
                $field,
                $collection,
                $uuidToTempId,
                $referencedAssets
            );
            if ($mapped !== null) {
                $out[$fieldName] = $mapped;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, array<string, mixed>>  $referencedAssets
     */
    protected static function mapSnapshotFieldValueForExport(
        mixed $value,
        Field $field,
        Collection $collection,
        array $uuidToTempId,
        array &$referencedAssets
    ): mixed {
        if ($field->type === 'media') {
            return self::mapSnapshotMediaToArchiveRefs($value, $collection->project, $referencedAssets);
        }

        if ($field->type !== 'group' && ! empty($field->options['repeatable'])) {
            if (! is_array($value)) {
                return $value;
            }

            $mappedValues = [];
            foreach ($value as $repeatableValue) {
                $mappedValues[] = self::mapSnapshotScalarValueForExport(
                    $repeatableValue,
                    $field,
                    $collection,
                    $uuidToTempId,
                    $referencedAssets
                );
            }

            return array_values($mappedValues);
        }

        return self::mapSnapshotScalarValueForExport(
            $value,
            $field,
            $collection,
            $uuidToTempId,
            $referencedAssets
        );
    }

    /**
     * @param  array<string, array<string, mixed>>  $referencedAssets
     */
    protected static function mapSnapshotScalarValueForExport(
        mixed $value,
        Field $field,
        Collection $collection,
        array $uuidToTempId,
        array &$referencedAssets
    ): mixed {
        return match ($field->type) {
            'relation' => self::mapSnapshotRelationToTempIds($value, $uuidToTempId),
            'media' => self::mapSnapshotMediaToArchiveRefs($value, $collection->project, $referencedAssets),
            'group' => self::mapSnapshotGroupToExport(
                $value,
                $field,
                $collection,
                $uuidToTempId,
                $referencedAssets
            ),
            default => $value,
        };
    }

    /**
     * @return array<int, string>|mixed
     */
    protected static function mapSnapshotRelationToTempIds(mixed $value, array $uuidToTempId)
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value) && isset($value['uuid'])) {
            $tid = $uuidToTempId[$value['uuid']] ?? null;

            return $tid !== null ? [$tid] : [];
        }

        if (! is_array($value)) {
            return $value;
        }

        return collect($value)
            ->map(function ($item) use ($uuidToTempId) {
                if (is_array($item) && isset($item['uuid'])) {
                    return $uuidToTempId[$item['uuid']] ?? null;
                }

                return null;
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, array<string, mixed>>  $referencedAssets
     */
    protected static function mapSnapshotMediaToArchiveRefs(
        mixed $value,
        Project $project,
        array &$referencedAssets
    ): mixed {
        return self::mapSnapshotMediaNode($value, $project, $referencedAssets, true);
    }

    /**
     * @param  array<string, array<string, mixed>>  $referencedAssets
     */
    protected static function mapSnapshotMediaNode(
        mixed $value,
        Project $project,
        array &$referencedAssets,
        bool $isRoot
    ): mixed {
        if (is_array($value) && (isset($value['uuid']) || isset($value['id']))) {
            $asset = self::findSnapshotAsset($project, $value);
            $archivePath = $asset ? self::addAssetToManifest($asset, $referencedAssets) : null;

            return $isRoot ? array_values(array_filter([$archivePath])) : $archivePath;
        }

        if (is_string($value) || is_int($value)) {
            $asset = self::findSnapshotAsset($project, $value);
            $archivePath = $asset ? self::addAssetToManifest($asset, $referencedAssets) : null;

            return $isRoot ? array_values(array_filter([$archivePath])) : $archivePath;
        }

        if (! is_array($value)) {
            return $value === null ? null : [];
        }

        $mapped = [];
        foreach ($value as $item) {
            $mappedItem = self::mapSnapshotMediaNode($item, $project, $referencedAssets, false);
            if ($mappedItem !== null && $mappedItem !== []) {
                $mapped[] = $mappedItem;
            }
        }

        return $mapped;
    }

    /**
     * @param  array{id?: mixed, uuid?: mixed}|int|string  $identifier
     */
    protected static function findSnapshotAsset(Project $project, array|int|string $identifier): ?Asset
    {
        $assets = $project->assets;

        if (is_array($identifier)) {
            if (isset($identifier['uuid'])) {
                return $assets->firstWhere('uuid', (string) $identifier['uuid']);
            }

            return isset($identifier['id']) ? $assets->firstWhere('id', (int) $identifier['id']) : null;
        }

        if (is_int($identifier) || ctype_digit($identifier)) {
            return $assets->firstWhere('id', (int) $identifier);
        }

        return $assets->firstWhere('uuid', $identifier);
    }

    /**
     * @param  array<string, array<string, mixed>>  $referencedAssets
     * @return array<int, array<string, mixed>>|array<string, mixed>|null
     */
    protected static function mapSnapshotGroupToExport(
        mixed $value,
        Field $field,
        Collection $collection,
        array $uuidToTempId,
        array &$referencedAssets
    ): ?array {
        if (! $field->relationLoaded('children')) {
            $field->load('children');
        }

        $isRepeatable = (bool) ($field->options['repeatable'] ?? false);
        if ($isRepeatable) {
            $rows = is_array($value) ? array_values($value) : [];
        } else {
            $rows = (is_array($value) && $value !== []) ? [$value] : [];
        }

        $outRows = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $instance = [];
            foreach ($field->children as $child) {
                if (! array_key_exists($child->name, $row)) {
                    continue;
                }
                $instance[$child->name] = self::mapSnapshotFieldValueForExport(
                    $row[$child->name],
                    $child,
                    $collection,
                    $uuidToTempId,
                    $referencedAssets
                );
            }
            $outRows[] = $instance;
        }

        if ($isRepeatable) {
            return $outRows;
        }

        return $outRows[0] ?? null;
    }

    /**
     * @param  array<string, array<string, mixed>>  $referencedAssets
     * @return array<string, mixed>
     */
    protected static function exportFieldsFromLiveFieldValues(
        ContentEntry $entry,
        array $uuidToTempId,
        array &$referencedAssets
    ): array {
        $entry->loadMissing('fieldValues.mediaRelations.asset.metadata');
        $fields = [];
        foreach ($entry->fieldValues as $fv) {
            $fieldName = $fv->field->name ?? null;
            if (! $fieldName) {
                continue;
            }

            switch ($fv->field->type) {
                case 'number':
                    $val = $fv->number_value;
                    break;
                case 'boolean':
                    $val = $fv->boolean_value;
                    break;
                case 'date':
                case 'datetime':
                    $val = $fv->date_value ?? $fv->datetime_value;
                    break;
                case 'enumeration':
                case 'json':
                    $val = $fv->json_value;
                    break;
                case 'relation':
                    $val = $fv->valueRelations
                        ->pluck('related.uuid')
                        ->map(fn ($u) => $uuidToTempId[$u] ?? null)
                        ->filter()
                        ->values()
                        ->all();
                    break;
                case 'media':
                    $val = self::mediaRelationsToArchiveRefs($fv, $referencedAssets);
                    break;
                case 'group':
                    $groupInstances = $entry->fieldGroups()
                        ->where('field_id', $fv->field->id)
                        ->orderBy('sort_order')
                        ->get();

                    $groupValues = [];
                    foreach ($groupInstances as $groupInstance) {
                        $instanceData = [];
                        $childFields = $fv->field->children()->orderBy('order')->get();
                        foreach ($childFields as $childField) {
                            $childValue = $entry->fieldValues()
                                ->where('field_id', $childField->id)
                                ->where('group_instance_id', $groupInstance->id)
                                ->first();

                            if ($childValue) {
                                $instanceData[$childField->name] = self::getFieldValue(
                                    $childValue,
                                    $childField,
                                    $referencedAssets
                                );
                            }
                        }
                        $groupValues[] = $instanceData;
                    }
                    $val = $fv->field->options['repeatable'] ?? false ? $groupValues : ($groupValues[0] ?? null);
                    break;
                default:
                    $val = $fv->text_value;
                    break;
            }

            if ($fv->field->type !== 'group' && ($fv->field->options['repeatable'] ?? false)) {
                $allValues = [];
                $repeatableValues = $entry->fieldValues()
                    ->where('field_id', $fv->field->id)
                    ->get();

                foreach ($repeatableValues as $repeatableValue) {
                    $allValues[] = self::getFieldValue(
                        $repeatableValue,
                        $fv->field,
                        $referencedAssets
                    );
                }

                $val = $allValues;
            }

            if ($val !== null) {
                $fields[$fieldName] = $val;
            }
        }

        return $fields;
    }

    /**
     * @param  array<string, array<string, mixed>>  $referencedAssets
     */
    protected static function getFieldValue(
        ContentFieldValue $fieldValue,
        Field $field,
        array &$referencedAssets
    ): mixed {
        switch ($field->type) {
            case 'number':
                return $fieldValue->number_value;
            case 'boolean':
                return $fieldValue->boolean_value;
            case 'date':
            case 'datetime':
                return $fieldValue->date_value ?? $fieldValue->datetime_value;
            case 'enumeration':
            case 'json':
                return $fieldValue->json_value;
            case 'media':
                $fieldValue->loadMissing('mediaRelations.asset.metadata');

                return self::mediaRelationsToArchiveRefs($fieldValue, $referencedAssets);
            default:
                return $fieldValue->text_value;
        }
    }

    /**
     * @param  array<string, array<string, mixed>>  $referencedAssets
     * @return array<int, string>
     */
    protected static function mediaRelationsToArchiveRefs(
        ContentFieldValue $fieldValue,
        array &$referencedAssets
    ): array {
        return $fieldValue->mediaRelations
            ->sortBy('sort_order')
            ->map(function ($relation) use (&$referencedAssets): ?string {
                return $relation->asset
                    ? self::addAssetToManifest($relation->asset, $referencedAssets)
                    : null;
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, array<string, mixed>>  $manifest
     */
    protected static function addAssetToManifest(Asset $asset, array &$manifest): string
    {
        $archivePath = self::archivePathForAsset($asset);
        $manifest[$archivePath] = self::assetMetadata($asset);

        return $archivePath;
    }

    public static function archivePathForAsset(Asset $asset): string
    {
        $originalFilename = basename($asset->original_filename);
        $extension = Str::lower(pathinfo($originalFilename, PATHINFO_EXTENSION));
        $basename = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME));
        $safeFilename = $basename !== '' ? $basename : 'asset';

        $safeExtension = preg_replace('/[^a-z0-9]+/', '', $extension);
        if ($safeExtension !== '') {
            $safeFilename .= '.'.$safeExtension;
        }

        return 'assets/'.$asset->uuid.'-'.$safeFilename;
    }

    /**
     * @param  array<int, Asset>  $assets
     * @return array<string, array<string, mixed>>
     */
    protected static function assetManifest(array $assets): array
    {
        $manifest = [];

        foreach ($assets as $asset) {
            $manifest[self::archivePathForAsset($asset)] = self::assetMetadata($asset);
        }

        return $manifest;
    }

    /**
     * @return array{uuid: string, original_filename: string, mime_type: string, size: int}
     */
    protected static function assetMetadata(Asset $asset): array
    {
        return [
            'uuid' => (string) $asset->uuid,
            'original_filename' => $asset->original_filename,
            'mime_type' => $asset->mime_type,
            'size' => (int) $asset->size,
        ];
    }

    protected static function validateAssetScope(string $assetScope, bool $includesContent): void
    {
        if (! in_array($assetScope, ['none', 'referenced', 'all'], true)) {
            throw new InvalidArgumentException("Unsupported asset scope [{$assetScope}].");
        }

        if ($assetScope === 'referenced' && ! $includesContent) {
            throw new InvalidArgumentException('Referenced assets require published content to be included.');
        }
    }
}
