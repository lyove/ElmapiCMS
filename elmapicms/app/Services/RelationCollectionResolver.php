<?php

namespace App\Services;

use App\Models\Collection;
use App\Models\Field;
use App\Models\Project;
use Illuminate\Support\Str;

class RelationCollectionResolver
{
    /**
     * Resolve a relation target to a collection ID within the project.
     *
     * Accepts a positive integer collection ID when that collection exists in the project,
     * or a string matching collection slug (exact or slugified) or name.
     *
     * @param  bool  $allowOrdinalFallback  When true, integers 1–50 that are not valid IDs select the Nth collection by order (AI tooling).
     */
    public static function resolveToId(Project $project, mixed $ref, bool $allowOrdinalFallback = false): ?int
    {
        if ($ref === null || $ref === '') {
            return null;
        }

        $tryAsId = self::coercePositiveIntId($ref);

        if ($tryAsId !== null) {
            if ($project->collections()->where('id', $tryAsId)->exists()) {
                return $tryAsId;
            }
        }

        $match = $project->collections()
            ->where(function ($q) use ($ref) {
                $q->where('slug', Str::slug((string) $ref))
                    ->orWhere('name', (string) $ref)
                    ->orWhere('slug', (string) $ref);
            })
            ->first();

        if ($match) {
            return $match->id;
        }

        if ($allowOrdinalFallback && is_numeric($ref) && (int) $ref >= 1 && (int) $ref <= 50) {
            $nthCollection = $project->collections()
                ->orderBy('order')
                ->orderBy('id')
                ->skip((int) $ref - 1)
                ->first();

            return $nthCollection?->id;
        }

        return null;
    }

    /**
     * Normalize relation options: accept `collection` or legacy `collection_id`, resolve to a stored collection ID when possible.
     *
     * @param  bool  $allowOrdinalFallback  Passed to {@see resolveToId()}.
     * @param  bool  $allowUnresolvedString  When resolution fails, keep a non-numeric string (e.g. import before target collection exists).
     * @return string|null Error message for strict callers, or null on success.
     */
    public static function tryNormalizeRelationOptions(
        Project $project,
        array &$options,
        bool $allowOrdinalFallback = false,
        bool $allowUnresolvedString = false,
    ): ?string {
        if (! isset($options['relation']) || ! is_array($options['relation'])) {
            return null;
        }

        $relation = &$options['relation'];
        $ref = $relation['collection'] ?? $relation['collection_id'] ?? null;

        if (array_key_exists('collection_id', $relation)) {
            unset($relation['collection_id']);
        }

        if ($ref === null || $ref === '') {
            $relation['collection'] = null;

            return null;
        }

        $id = self::resolveToId($project, $ref, $allowOrdinalFallback);

        if ($id !== null) {
            $relation['collection'] = $id;

            return null;
        }

        if ($allowUnresolvedString && is_string($ref) && ! self::isStrictIntegerString($ref)) {
            $relation['collection'] = $ref;

            return null;
        }

        return 'The relation target collection is invalid or does not belong to this project.';
    }

    /**
     * Resolve the target collection ID for a field's stored options (supports legacy `collection_id`).
     */
    public static function relationTargetCollectionId(Project $project, mixed $fieldOptions): ?int
    {
        if (! is_array($fieldOptions)) {
            return null;
        }

        $relation = $fieldOptions['relation'] ?? null;
        if (! is_array($relation)) {
            return null;
        }

        $ref = $relation['collection'] ?? $relation['collection_id'] ?? null;

        return self::resolveToId($project, $ref, false);
    }

    /**
     * Field options for Inertia / content UI: ensure relation.collection is a numeric ID when it can be resolved.
     *
     * Web routes resolve `{collection}` by primary key; slugs in stored options would otherwise produce 404s on relation-picker requests.
     *
     * @return array<string, mixed>
     */
    public static function optionsWithResolvedRelationTarget(Field $field, Project $project): array
    {
        $options = $field->options ?? [];
        if ($field->type !== 'relation') {
            return $options;
        }

        $resolvedId = self::relationTargetCollectionId($project, $options);
        if ($resolvedId !== null) {
            $options['relation'] ??= [];
            $options['relation']['collection'] = $resolvedId;
            unset($options['relation']['collection_id']);
        }

        return $options;
    }

    /**
     * When a collection's slug changes, relation fields may still store the old slug in options.relation.collection.
     * Rewrite matching string references to the target collection's numeric ID so relations keep working.
     *
     * Matches the previous slug exactly (case-insensitive) or the same value after {@see Str::slug()}.
     *
     * @return int Number of field rows updated
     */
    public static function rewriteRelationOptionsReferencingCollectionSlug(Project $project, string $previousSlug, Collection $targetCollection): int
    {
        if ($previousSlug === '' || $targetCollection->project_id !== $project->id) {
            return 0;
        }

        $normalizedPrevious = Str::slug($previousSlug);
        $updated = 0;

        $fields = Field::query()
            ->where('project_id', $project->id)
            ->where('type', 'relation')
            ->get();

        foreach ($fields as $field) {
            $options = $field->options ?? [];
            if (! isset($options['relation']) || ! is_array($options['relation'])) {
                continue;
            }

            $ref = $options['relation']['collection'] ?? null;
            if (! is_string($ref) || $ref === '') {
                $legacy = $options['relation']['collection_id'] ?? null;
                $ref = (is_string($legacy) && $legacy !== '' && ! self::isStrictIntegerString($legacy))
                    ? $legacy
                    : null;
            }
            if ($ref === null || $ref === '') {
                continue;
            }

            if (! self::stringRefMatchesPreviousCollectionSlug($ref, $previousSlug, $normalizedPrevious)) {
                continue;
            }

            $options['relation']['collection'] = $targetCollection->id;
            unset($options['relation']['collection_id']);
            $field->update(['options' => $options]);
            $updated++;
        }

        return $updated;
    }

    private static function stringRefMatchesPreviousCollectionSlug(string $ref, string $previousSlug, string $normalizedPrevious): bool
    {
        if (strcasecmp($ref, $previousSlug) === 0) {
            return true;
        }

        return Str::slug($ref) === $normalizedPrevious;
    }

    private static function coercePositiveIntId(mixed $ref): ?int
    {
        if (is_int($ref)) {
            return $ref > 0 ? $ref : null;
        }

        if (is_string($ref) && $ref !== '' && self::isStrictIntegerString($ref)) {
            $id = (int) $ref;

            return $id > 0 ? $id : null;
        }

        return null;
    }

    private static function isStrictIntegerString(string $ref): bool
    {
        return is_numeric($ref) && (string) (int) $ref === $ref;
    }
}
