<?php

namespace App\Ai\Tools;

use App\Models\Collection;
use App\Models\Field;
use App\Models\Project;
use App\Services\RelationCollectionResolver;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\ObjectType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;

class CreateSchema implements Tool
{
    /**
     * Valid field types.
     */
    public const FIELD_TYPES = [
        'text', 'longtext', 'richtext', 'slug', 'email', 'password',
        'number', 'enumeration', 'boolean', 'color', 'date', 'time',
        'datetime', 'media', 'relation', 'json', 'group',
    ];

    /**
     * Get the description of the tool's purpose.
     */
    public function description(): string
    {
        return 'Create a collection (schema) with fields in a project. '
            .'Field types: text, longtext, richtext, slug, email, password, number, enumeration, boolean, color, date, time, datetime, media, relation, json, group.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): string
    {
        $user = auth()->user();
        $projectId = (int) (string) $request->string('project_id');
        $name = trim((string) $request->string('name'));
        $isSingleton = (bool) $request->boolean('is_singleton');

        // Validate project access
        $project = Project::find($projectId);

        if (! $project) {
            return json_encode(['error' => "Project {$projectId} not found."]);
        }

        if (! $user->can('access_all_projects') && ! $user->projects()->where('projects.id', $project->id)->exists()) {
            return json_encode(['error' => 'You do not have access to this project.']);
        }

        if (! $user->can('create_collection')) {
            return json_encode(['error' => 'You do not have permission to create collections.']);
        }

        // Validate collection name
        if ($name === '') {
            return json_encode(['error' => 'Collection name is required.']);
        }

        if (strlen($name) > 60) {
            return json_encode(['error' => 'Collection name must be 60 characters or less.']);
        }

        // Generate slug
        $slug = Str::slug($name);

        if ($slug === '' || strlen($slug) > 60) {
            return json_encode(['error' => 'Could not generate a valid slug from the collection name.']);
        }

        // Reserved slugs
        if (in_array($slug, ['collections', 'files'])) {
            return json_encode(['error' => "The slug \"{$slug}\" is reserved."]);
        }

        // Check uniqueness
        $exists = Collection::where('project_id', $project->id)->where('slug', $slug)->exists();

        if ($exists) {
            return json_encode(['error' => "A collection with slug \"{$slug}\" already exists in this project."]);
        }

        // Parse fields — accept typed array (new) or JSON string (fallback)
        $fields = self::parseFieldsInput($request['fields'] ?? null);

        // Validate fields
        $validationError = $this->validateFields($fields);
        if ($validationError) {
            return json_encode(['error' => $validationError]);
        }

        // Create everything in a transaction
        $result = DB::transaction(function () use ($project, $name, $slug, $isSingleton, $fields) {
            $order = $project->collections()->count() + 1;

            $collection = $project->collections()->create([
                'name' => $name,
                'slug' => $slug,
                'is_singleton' => $isSingleton,
                'order' => $order,
            ]);

            $fieldsCreated = $this->createFields($fields, $project, $collection);

            return [
                'collection_id' => $collection->id,
                'name' => $collection->name,
                'slug' => $collection->slug,
                'fields_created' => $fieldsCreated,
                'project_url' => "/projects/{$project->id}",
                'message' => "Collection \"{$collection->name}\" created with {$fieldsCreated} fields. Use collection_id {$collection->id} for relation fields.",
                'action' => 'reload',
            ];
        });

        return json_encode($result);
    }

    /**
     * Validate the field definitions before creating.
     */
    protected function validateFields(array $fields, bool $isChild = false): ?string
    {
        $names = [];

        foreach ($fields as $i => $field) {
            $pos = $i + 1;

            if (! is_array($field)) {
                return "Field #{$pos}: must be an object.";
            }

            $type = $field['type'] ?? null;
            $label = $field['label'] ?? null;

            if (! $type || ! in_array($type, self::FIELD_TYPES)) {
                return "Field #{$pos}: invalid or missing type \"{$type}\".";
            }

            if (! $label || ! is_string($label) || strlen($label) > 60) {
                return "Field #{$pos}: label is required (max 60 chars).";
            }

            // Generate or validate name
            $name = $field['name'] ?? Str::slug($label);

            if (! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $name)) {
                return "Field #{$pos} \"{$label}\": name \"{$name}\" is invalid (lowercase letters, numbers, hyphens only).";
            }

            if (in_array($name, $names)) {
                return "Field #{$pos} \"{$label}\": duplicate field name \"{$name}\".";
            }

            $names[] = $name;

            // Groups cannot be nested
            if ($type === 'group' && $isChild) {
                return "Field #{$pos} \"{$label}\": group fields cannot be nested inside another group.";
            }

            // Group requires repeatable option
            if ($type === 'group') {
                $options = $field['options'] ?? [];
                if (! isset($options['repeatable']) || ! is_bool($options['repeatable'])) {
                    // Default to false if not specified
                }

                // Validate children
                $children = $field['children'] ?? [];
                if (! empty($children)) {
                    $childError = $this->validateFields($children, true);
                    if ($childError) {
                        return "Group \"{$label}\" > {$childError}";
                    }
                }
            }
        }

        return null;
    }

    /**
     * Known option keys that the AI may place at field level instead of inside 'options'.
     */
    private static array $optionKeys = [
        'slug', 'relation', 'media', 'editor', 'enumeration',
        'repeatable', 'multiple', 'includeDraft', 'includeTime', 'mode',
    ];

    /**
     * Convert a flat field definition (from the typed schema) to the nested format.
     *
     * Flat format uses top-level keys like slug_field, relation_collection, etc.
     * This converts them to the nested options/validations structure that the
     * existing createFields/buildOptions/buildValidations pipeline expects.
     *
     * Also handles backward compatibility: if the field already has nested
     * 'options' or 'validations' keys, those are preserved.
     */
    public static function flatToFieldData(array $flat): array
    {
        $result = [];

        // Only include keys that are explicitly present (important for partial updates)
        foreach (['type', 'label', 'name', 'description', 'placeholder'] as $key) {
            if (array_key_exists($key, $flat)) {
                $result[$key] = $flat[$key];
            }
        }

        // ── Build options from flat properties ──
        $options = [];

        if (isset($flat['slug_field'])) {
            $options['slug'] = [
                'field' => $flat['slug_field'],
                'readonly' => $flat['slug_readonly'] ?? false,
            ];
        }

        if (isset($flat['relation_collection'])) {
            $options['relation'] = [
                'collection' => $flat['relation_collection'],
                'type' => $flat['relation_type'] ?? 1,
            ];
        }

        if (isset($flat['media_type'])) {
            $options['media'] = ['type' => (int) $flat['media_type']];
        }

        if (isset($flat['enumeration_list'])) {
            $list = is_array($flat['enumeration_list'])
                ? $flat['enumeration_list']
                : array_filter(array_map('trim', explode(',', $flat['enumeration_list'])));
            $options['enumeration'] = ['list' => array_values($list)];
        }

        if (isset($flat['repeatable'])) {
            $options['repeatable'] = (bool) $flat['repeatable'];
        }

        if (isset($flat['multiple'])) {
            $options['multiple'] = (bool) $flat['multiple'];
        }

        if (isset($flat['include_time'])) {
            $options['includeTime'] = (bool) $flat['include_time'];
        }

        // Preserve any existing nested 'options' (backward compat with larger models)
        if (isset($flat['options']) && is_array($flat['options'])) {
            foreach ($flat['options'] as $key => $value) {
                if (! isset($options[$key])) {
                    $options[$key] = $value;
                }
            }
        }

        if (! empty($options)) {
            $result['options'] = $options;
        }

        // ── Build validations from flat properties ──
        $validations = [];

        if (! empty($flat['required'])) {
            $validations['required'] = ['status' => true];
        }

        if (! empty($flat['unique'])) {
            $validations['unique'] = ['status' => true];
        }

        // Preserve any existing nested 'validations' (backward compat)
        if (isset($flat['validations']) && is_array($flat['validations'])) {
            foreach ($flat['validations'] as $key => $value) {
                if (! isset($validations[$key])) {
                    $validations[$key] = $value;
                }
            }
        }

        if (! empty($validations)) {
            $result['validations'] = $validations;
        }

        // ── Process children (for group type) ──
        if (! empty($flat['children']) && is_array($flat['children'])) {
            $result['children'] = array_map([static::class, 'flatToFieldData'], $flat['children']);
        }

        return $result;
    }

    /**
     * Normalize a field definition: move misplaced option keys into 'options'.
     * Also unwrap double-nested keys like options.slug.slug → options.slug.
     *
     * The AI sometimes produces:
     *   {"slug":{"slug":{"field":"Name"}},"type":"slug"}
     * instead of:
     *   {"type":"slug","options":{"slug":{"field":"Name"}}}
     */
    public static function normalizeFieldData(array $fieldData): array
    {
        if (! isset($fieldData['options'])) {
            $fieldData['options'] = [];
        }

        // Step 1: move misplaced top-level option keys into 'options'
        foreach (self::$optionKeys as $key) {
            if (isset($fieldData[$key]) && ! isset($fieldData['options'][$key])) {
                $fieldData['options'][$key] = $fieldData[$key];
                unset($fieldData[$key]);
            }
        }

        // Step 2: unwrap double-nested keys (e.g. options.slug.slug → options.slug)
        $nestedKeys = ['slug', 'relation', 'media', 'editor', 'enumeration'];
        foreach ($nestedKeys as $key) {
            if (isset($fieldData['options'][$key]) && is_array($fieldData['options'][$key]) && isset($fieldData['options'][$key][$key])) {
                $fieldData['options'][$key] = $fieldData['options'][$key][$key];
            }
        }

        return $fieldData;
    }

    /**
     * Build a complete options structure, merging AI-provided values with defaults.
     * Ensures all fields have the full options structure the UI expects.
     */
    public static function buildOptions(string $type, array $input = []): array
    {
        $defaults = [
            'mode' => 'single',
            'slug' => ['field' => null, 'readonly' => false],
            'media' => ['type' => 1],
            'editor' => ['type' => 1, 'mode' => 'lexical', 'outputFormat' => 'html'],
            'multiple' => false,
            'relation' => ['type' => 1, 'collection' => null],
            'repeatable' => false,
            'enumeration' => ['list' => []],
            'hiddenInAPI' => false,
            'includeTime' => false,
            'includeDraft' => false,
            'numberOfMonths' => 1,
            'hideInContentList' => false,
        ];

        // Deep merge: for nested arrays, merge individual keys
        foreach ($input as $key => $value) {
            if (isset($defaults[$key]) && is_array($defaults[$key]) && is_array($value)) {
                $defaults[$key] = array_merge($defaults[$key], $value);
            } else {
                $defaults[$key] = $value;
            }
        }

        return $defaults;
    }

    /**
     * Build a complete validations structure, merging AI-provided values with defaults.
     */
    public static function buildValidations(array $input = []): array
    {
        $defaults = [
            'unique' => ['status' => false, 'message' => null],
            'required' => ['status' => false, 'message' => null],
            'charcount' => ['max' => null, 'min' => null, 'type' => 'Between', 'status' => false, 'message' => null],
        ];

        foreach ($defaults as $key => $defaultValues) {
            if (isset($input[$key]) && is_array($input[$key])) {
                $defaults[$key] = array_merge($defaultValues, $input[$key]);
            }
        }

        return $defaults;
    }

    /**
     * Resolve relation collection and slug field references in raw options.
     *
     * Handles all the ways the AI may reference things:
     * - Relation collection: by ID, name, slug, or ordinal position
     * - Slug field: by field name or label (case-insensitive)
     *
     * @param  array  &$options  Raw options to resolve (mutated in place)
     * @param  string  $type  The field type
     * @param  Project  $project  For collection lookups
     * @param  Collection|null  $collection  For slug field lookups via DB (null during batch creation)
     * @param  array  $siblingFields  Raw field arrays for batch creation (slug resolution when fields don't exist in DB yet)
     */
    public static function resolveOptions(array &$options, string $type, Project $project, ?Collection $collection = null, array $siblingFields = []): void
    {
        // ── Slug: resolve slug.field — AI may pass label instead of field name ──
        if ($type === 'slug' && isset($options['slug']['field']) && $options['slug']['field'] !== null) {
            $ref = $options['slug']['field'];

            // 1. Try matching sibling field arrays (batch creation)
            if (! empty($siblingFields)) {
                $nameMatch = collect($siblingFields)->first(fn ($f) => ($f['name'] ?? Str::slug($f['label'] ?? '')) === $ref);
                if (! $nameMatch) {
                    $labelMatch = collect($siblingFields)->first(fn ($f) => strcasecmp($f['label'] ?? '', $ref) === 0);
                    if ($labelMatch) {
                        $options['slug']['field'] = $labelMatch['name'] ?? Str::slug($labelMatch['label']);
                        $ref = null; // resolved
                    }
                } else {
                    $ref = null; // already matches a name
                }
            }

            // 2. Try matching existing DB fields in the collection
            if ($ref !== null && $collection) {
                $byName = $collection->fields()->where('name', $ref)->exists();
                if (! $byName) {
                    $byLabel = $collection->fields()->whereRaw('LOWER(label) = ?', [strtolower($ref)])->first();
                    if ($byLabel) {
                        $options['slug']['field'] = $byLabel->name;
                    } else {
                        $options['slug']['field'] = Str::slug($ref);
                    }
                }
            }
        }

        // ── Relation: resolve collection reference — by ID, name, slug, or ordinal (AI) ──
        if ($type === 'relation') {
            RelationCollectionResolver::tryNormalizeRelationOptions($project, $options, true, true);
        }
    }

    /**
     * Create field records from the definitions array.
     */
    protected function createFields(array $fields, Project $project, Collection $collection, ?int $parentFieldId = null): int
    {
        $count = 0;

        foreach ($fields as $i => $fieldData) {
            // Normalize: move misplaced option keys into 'options'
            $fieldData = self::normalizeFieldData($fieldData);

            $name = $fieldData['name'] ?? Str::slug($fieldData['label']);
            $type = $fieldData['type'];
            $rawOptions = $fieldData['options'] ?? [];

            // Auto-resolve slug field references and relation collection IDs
            self::resolveOptions($rawOptions, $type, $project, $collection, $fields);

            $options = self::buildOptions($type, $rawOptions);
            $validations = self::buildValidations($fieldData['validations'] ?? []);

            $order = $parentFieldId
                ? Field::where('parent_field_id', $parentFieldId)->max('order') + 1
                : $collection->fields()->max('order') + 1;

            $field = Field::create([
                'type' => $type,
                'label' => $fieldData['label'],
                'name' => $name,
                'description' => $fieldData['description'] ?? null,
                'placeholder' => $fieldData['placeholder'] ?? null,
                'options' => $options,
                'validations' => $validations,
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'parent_field_id' => $parentFieldId,
                'order' => $order,
            ]);

            $count++;

            // Create children for group fields
            if ($type === 'group' && ! empty($fieldData['children'])) {
                $count += $this->createFields($fieldData['children'], $project, $collection, $field->id);
            }
        }

        return $count;
    }

    /**
     * Parse a fields input that may be a typed array or a JSON string (fallback).
     * Applies flatToFieldData conversion for typed array format.
     */
    public static function parseFieldsInput(mixed $input): array
    {
        if (is_array($input)) {
            // Typed array from structured schema — convert flat to nested
            return array_map([static::class, 'flatToFieldData'], $input);
        }

        if (is_string($input)) {
            $input = trim($input);
            if ($input === '') {
                return [];
            }

            $decoded = json_decode($input, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    /**
     * Build a field object schema definition for use in tool schemas.
     * Flat format: type-specific options are top-level keys, not nested JSON.
     */
    public static function fieldObjectSchema(JsonSchema $schema, bool $includeChildren = true): ObjectType
    {
        $properties = [
            'type' => $schema->string()
                ->description('text, longtext, richtext, slug, email, password, number, enumeration, boolean, color, date, time, datetime, media, relation, json, group')
                ->required(),
            'label' => $schema->string()
                ->description('Display label (max 60 chars)')
                ->required(),
            'name' => $schema->string()
                ->description('Field name slug (auto-generated from label if omitted)'),
            'required' => $schema->boolean()
                ->description('Is this field required?'),
            'unique' => $schema->boolean()
                ->description('Must values be unique?'),
            'slug_field' => $schema->string()
                ->description('For slug: name of the source text field to generate slug from'),
            'slug_readonly' => $schema->boolean()
                ->description('For slug: read-only after creation'),
            'relation_collection' => $schema->string()
                ->description('For relation: target collection name or ID'),
            'relation_type' => $schema->integer()
                ->description('For relation: 1=oneToOne, 2=oneToMany'),
            'media_type' => $schema->integer()
                ->description('For media: 1=single, 2=multiple'),
            'enumeration_list' => $schema->string()
                ->description('For enumeration: comma-separated values like "opt1,opt2,opt3"'),
            'multiple' => $schema->boolean()
                ->description('For enumeration: allow multiple selections'),
            'repeatable' => $schema->boolean()
                ->description('Make field repeatable (group, text, longtext)'),
            'include_time' => $schema->boolean()
                ->description('For date/datetime: include time'),
        ];

        if ($includeChildren) {
            $properties['children'] = $schema->array()
                ->items(self::fieldObjectSchema($schema, false))
                ->description('For group type: child fields');
        }

        // Note: do NOT use withoutAdditionalProperties() — Gemini rejects it
        return $schema->object($properties);
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'project_id' => $schema
                ->integer()
                ->description('Target project ID')
                ->required(),
            'name' => $schema
                ->string()
                ->description('Collection name (max 60 chars). Slug is auto-generated.')
                ->required(),
            'is_singleton' => $schema
                ->boolean()
                ->description('True for single-entry collections (e.g. site settings)'),
            'fields' => $schema
                ->array()
                ->items(self::fieldObjectSchema($schema))
                ->description('Array of field definitions'),
        ];
    }
}
