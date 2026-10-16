<?php

namespace App\Ai\Tools;

use App\Models\Collection;
use App\Models\Field;
use App\Models\Project;
use App\Services\RelationCollectionResolver;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;

class ManageSchema implements Tool
{
    /**
     * Valid field types.
     */
    protected const FIELD_TYPES = [
        'text', 'longtext', 'richtext', 'slug', 'email', 'password',
        'number', 'enumeration', 'boolean', 'color', 'date', 'time',
        'datetime', 'media', 'relation', 'json', 'group',
    ];

    /**
     * Get the description of the tool's purpose.
     */
    public function description(): string
    {
        return 'Manage existing collection schemas: list fields, add/update/delete fields, update/delete collections.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): string
    {
        $action = trim((string) $request->string('action'));
        $projectId = (int) (string) $request->string('project_id');
        $collectionId = (int) (string) $request->string('collection_id');
        $fieldId = (int) (string) $request->string('field_id');

        $user = auth()->user();

        // Validate project access
        $project = Project::find($projectId);

        if (! $project) {
            return json_encode(['error' => "Project {$projectId} not found."]);
        }

        if (! $user->can('access_all_projects') && ! $user->projects()->where('projects.id', $project->id)->exists()) {
            return json_encode(['error' => 'You do not have access to this project.']);
        }

        // Parse data — for field operations, convert flat to nested; for collection operations, pass raw
        $isFieldAction = in_array($action, ['add_field', 'update_field']);
        $data = self::parseDataInput($request['data'] ?? null, $isFieldAction);

        return match ($action) {
            'list_fields' => $this->listFields($project, $collectionId),
            'add_field' => $this->addField($user, $project, $collectionId, $data),
            'update_field' => $this->updateField($user, $project, $collectionId, $fieldId, $data),
            'delete_field' => $this->deleteField($user, $project, $collectionId, $fieldId),
            'update_collection' => $this->updateCollection($user, $project, $collectionId, $data),
            'delete_collection' => json_encode(['error' => 'Deleting collections is not allowed via AI. Navigate to collection settings to delete manually.']),
            default => json_encode(['error' => "Unknown action \"{$action}\". Use: list_fields, add_field, update_field, delete_field, update_collection."]),
        };
    }

    /**
     * Parse a data input that may be a typed object (array) or a JSON string (fallback).
     * For field operations, converts flat format to nested options/validations.
     * For collection operations, passes data through as-is.
     */
    protected static function parseDataInput(mixed $input, bool $isFieldAction = true): array
    {
        if (is_array($input)) {
            // For field actions, convert flat properties to nested options/validations
            return $isFieldAction ? CreateSchema::flatToFieldData($input) : $input;
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
     * List all fields in a collection.
     */
    protected function listFields(Project $project, int $collectionId): string
    {
        $collection = $this->findCollection($project, $collectionId);

        if (is_string($collection)) {
            return $collection; // error JSON
        }

        $fields = $collection->fields()
            ->orderBy('order')
            ->get(['id', 'type', 'label', 'name', 'options', 'validations', 'order', 'parent_field_id'])
            ->map(function ($field) {
                $result = [
                    'id' => $field->id,
                    'type' => $field->type,
                    'label' => $field->label,
                    'name' => $field->name,
                    'order' => $field->order,
                ];

                if (! empty($field->options)) {
                    $result['options'] = $field->options;
                }

                if (! empty($field->validations)) {
                    $result['validations'] = $field->validations;
                }

                // Include children for group fields
                if ($field->type === 'group' && $field->relationLoaded('children')) {
                    $result['children'] = $field->children->map(fn ($child) => [
                        'id' => $child->id,
                        'type' => $child->type,
                        'label' => $child->label,
                        'name' => $child->name,
                        'order' => $child->order,
                        ...($child->options ? ['options' => $child->options] : []),
                        ...($child->validations ? ['validations' => $child->validations] : []),
                    ])->values();
                }

                return $result;
            });

        return json_encode([
            'collection' => $collection->name,
            'slug' => $collection->slug,
            'fields' => $fields,
        ]);
    }

    /**
     * Add a field to a collection.
     */
    protected function addField($user, Project $project, int $collectionId, array $data): string
    {
        if (! $user->can('create_field')) {
            return json_encode(['error' => 'You do not have permission to create fields.']);
        }

        $collection = $this->findCollection($project, $collectionId);

        if (is_string($collection)) {
            return $collection;
        }

        $type = $data['type'] ?? null;
        $label = $data['label'] ?? null;

        if (! $type || ! in_array($type, self::FIELD_TYPES)) {
            return json_encode(['error' => "Invalid or missing field type \"{$type}\"."]);
        }

        if (! $label || ! is_string($label) || strlen($label) > 60) {
            return json_encode(['error' => 'Field label is required (max 60 chars).']);
        }

        $name = $data['name'] ?? Str::slug($label);

        if (! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $name)) {
            return json_encode(['error' => "Field name \"{$name}\" is invalid."]);
        }

        // Check uniqueness within collection (top-level)
        $parentFieldId = $data['parent_field_id'] ?? null;

        $exists = Field::where('collection_id', $collection->id)
            ->where('parent_field_id', $parentFieldId)
            ->where('name', $name)
            ->exists();

        if ($exists) {
            return json_encode(['error' => "A field named \"{$name}\" already exists in this collection."]);
        }

        // Normalize: move misplaced option keys into 'options'
        $data = CreateSchema::normalizeFieldData($data);
        $rawOptions = $data['options'] ?? [];

        // Use shared resolver for relation and slug references
        CreateSchema::resolveOptions($rawOptions, $type, $project, $collection);

        $options = CreateSchema::buildOptions($type, $rawOptions);
        $validations = CreateSchema::buildValidations($data['validations'] ?? []);

        $result = DB::transaction(function () use ($collection, $project, $type, $label, $name, $data, $options, $validations, $parentFieldId) {
            $order = $parentFieldId
                ? Field::where('parent_field_id', $parentFieldId)->max('order') + 1
                : $collection->fields()->max('order') + 1;

            $field = Field::create([
                'type' => $type,
                'label' => $label,
                'name' => $name,
                'description' => $data['description'] ?? null,
                'placeholder' => $data['placeholder'] ?? null,
                'options' => $options,
                'validations' => $validations,
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'parent_field_id' => $parentFieldId,
                'order' => $order,
            ]);

            $count = 1;

            // Create children for group fields
            if ($type === 'group' && ! empty($data['children'])) {
                foreach ($data['children'] as $i => $childData) {
                    $childData = CreateSchema::normalizeFieldData($childData);
                    $childName = $childData['name'] ?? Str::slug($childData['label'] ?? '');
                    $childType = $childData['type'] ?? 'text';

                    $childRawOptions = $childData['options'] ?? [];
                    CreateSchema::resolveOptions($childRawOptions, $childType, $project, $collection, $data['children']);

                    $childOptions = CreateSchema::buildOptions($childType, $childRawOptions);
                    $childValidations = CreateSchema::buildValidations($childData['validations'] ?? []);

                    Field::create([
                        'type' => $childType,
                        'label' => $childData['label'],
                        'name' => $childName,
                        'description' => $childData['description'] ?? null,
                        'placeholder' => $childData['placeholder'] ?? null,
                        'options' => $childOptions,
                        'validations' => $childValidations,
                        'project_id' => $project->id,
                        'collection_id' => $collection->id,
                        'parent_field_id' => $field->id,
                        'order' => $i + 1,
                    ]);
                    $count++;
                }
            }

            return ['id' => $field->id, 'name' => $name, 'type' => $type, 'fields_created' => $count];
        });

        return json_encode(['success' => "Field \"{$label}\" added.", 'action' => 'reload', ...$result]);
    }

    /**
     * Update an existing field.
     */
    protected function updateField($user, Project $project, int $collectionId, int $fieldId, array $data): string
    {
        if (! $user->can('update_field')) {
            return json_encode(['error' => 'You do not have permission to update fields.']);
        }

        $collection = $this->findCollection($project, $collectionId);

        if (is_string($collection)) {
            return $collection;
        }

        $field = Field::where('id', $fieldId)->where('collection_id', $collection->id)->first();

        if (! $field) {
            return json_encode(['error' => "Field {$fieldId} not found in this collection."]);
        }

        // Normalize the input data (move misplaced option keys into 'options')
        $data = CreateSchema::normalizeFieldData($data);

        $update = [];

        // Determine the effective type (new type or existing)
        $effectiveType = $field->type;
        if (isset($data['type']) && in_array($data['type'], self::FIELD_TYPES)) {
            $update['type'] = $data['type'];
            $effectiveType = $data['type'];
        }

        if (isset($data['label'])) {
            $update['label'] = $data['label'];
        }

        if (isset($data['name'])) {
            $newName = $data['name'];

            if (! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $newName)) {
                return json_encode(['error' => "Field name \"{$newName}\" is invalid."]);
            }

            // Check uniqueness
            $exists = Field::where('collection_id', $collection->id)
                ->where('parent_field_id', $field->parent_field_id)
                ->where('name', $newName)
                ->where('id', '!=', $field->id)
                ->exists();

            if ($exists) {
                return json_encode(['error' => "A field named \"{$newName}\" already exists."]);
            }

            $update['name'] = $newName;
        }

        if (array_key_exists('description', $data)) {
            $update['description'] = $data['description'];
        }

        if (array_key_exists('placeholder', $data)) {
            $update['placeholder'] = $data['placeholder'];
        }

        // Process options through the full pipeline
        if (array_key_exists('options', $data) || isset($update['type'])) {
            $aiOptions = $data['options'] ?? [];
            $typeChanged = isset($update['type']) && $update['type'] !== $field->type;

            if ($typeChanged) {
                // Type changed: build fresh defaults for the new type, merge AI options on top
                $rawOptions = $aiOptions;
            } else {
                // Type unchanged: deep-merge AI options into existing field options
                $existingOptions = is_array($field->options) ? $field->options : (array) $field->options;
                $rawOptions = $existingOptions;
                foreach ($aiOptions as $key => $value) {
                    if (is_array($value) && isset($rawOptions[$key]) && is_array($rawOptions[$key])) {
                        $rawOptions[$key] = array_merge($rawOptions[$key], $value);
                    } else {
                        $rawOptions[$key] = $value;
                    }
                }
            }

            // Resolve relation and slug references
            CreateSchema::resolveOptions($rawOptions, $effectiveType, $project, $collection);

            // Build complete options with defaults
            $update['options'] = CreateSchema::buildOptions($effectiveType, $rawOptions);
        }

        // Process validations through the pipeline
        if (array_key_exists('validations', $data)) {
            $update['validations'] = CreateSchema::buildValidations($data['validations'] ?? []);
        }

        if (empty($update)) {
            return json_encode(['error' => 'No changes specified.']);
        }

        $field->update($update);

        return json_encode([
            'success' => "Field \"{$field->label}\" updated.",
            'id' => $field->id,
            'name' => $field->name,
            'type' => $field->type,
            'action' => 'reload',
        ]);
    }

    /**
     * Delete a field.
     */
    protected function deleteField($user, Project $project, int $collectionId, int $fieldId): string
    {
        if (! $user->can('delete_field')) {
            return json_encode(['error' => 'You do not have permission to delete fields.']);
        }

        $collection = $this->findCollection($project, $collectionId);

        if (is_string($collection)) {
            return $collection;
        }

        $field = Field::where('id', $fieldId)->where('collection_id', $collection->id)->first();

        if (! $field) {
            return json_encode(['error' => "Field {$fieldId} not found in this collection."]);
        }

        $label = $field->label;

        // Soft delete (also deletes children for groups)
        if ($field->type === 'group') {
            $field->children()->delete();
        }

        $field->delete();

        return json_encode(['success' => "Field \"{$label}\" deleted.", 'action' => 'reload']);
    }

    /**
     * Update a collection's name/description.
     */
    protected function updateCollection($user, Project $project, int $collectionId, array $data): string
    {
        if (! $user->can('update_collection')) {
            return json_encode(['error' => 'You do not have permission to update collections.']);
        }

        $collection = $this->findCollection($project, $collectionId);

        if (is_string($collection)) {
            return $collection;
        }

        $update = [];

        if (isset($data['name'])) {
            $name = trim($data['name']);

            if ($name === '' || strlen($name) > 60) {
                return json_encode(['error' => 'Collection name must be 1-60 characters.']);
            }

            $slug = Str::slug($name);

            if (in_array($slug, ['collections', 'files'])) {
                return json_encode(['error' => "The slug \"{$slug}\" is reserved."]);
            }

            // Check uniqueness
            $exists = Collection::where('project_id', $project->id)
                ->where('slug', $slug)
                ->where('id', '!=', $collection->id)
                ->exists();

            if ($exists) {
                return json_encode(['error' => "A collection with slug \"{$slug}\" already exists."]);
            }

            $update['name'] = $name;
            $update['slug'] = $slug;
        }

        if (empty($update)) {
            return json_encode(['error' => 'No changes specified.']);
        }

        $previousSlug = $collection->slug;

        $collection->update($update);

        if (isset($update['slug']) && $update['slug'] !== $previousSlug) {
            RelationCollectionResolver::rewriteRelationOptionsReferencingCollectionSlug(
                $project,
                $previousSlug,
                $collection->fresh(),
            );
        }

        return json_encode([
            'success' => 'Collection updated.',
            'name' => $collection->name,
            'slug' => $collection->slug,
            'action' => 'reload',
        ]);
    }

    /**
     * Delete a collection and all its content.
     */
    protected function deleteCollection($user, Project $project, int $collectionId): string
    {
        if (! $user->can('delete_collection')) {
            return json_encode(['error' => 'You do not have permission to delete collections.']);
        }

        $collection = $this->findCollection($project, $collectionId);

        if (is_string($collection)) {
            return $collection;
        }

        $name = $collection->name;

        DB::transaction(function () use ($collection) {
            // Delete content field values and relations
            $collection->contentEntries()->each(function ($entry) {
                $entry->fieldValues()->each(function ($fv) {
                    $fv->valueRelations()->forceDelete();
                    $fv->mediaRelations()->forceDelete();
                });
                $entry->fieldValues()->forceDelete();
            });

            // Delete content entries
            $collection->contentEntries()->forceDelete();

            // Delete fields (children first due to FK)
            $collection->allFields()->whereNotNull('parent_field_id')->forceDelete();
            $collection->allFields()->forceDelete();

            // Delete collection
            $collection->forceDelete();
        });

        return json_encode([
            'success' => "Collection \"{$name}\" and all its content deleted.",
            'action' => 'navigate',
            'url' => "/projects/{$collection->project_id}",
        ]);
    }

    /**
     * Find a collection by ID within a project.
     *
     * @return Collection|string String if error JSON
     */
    protected function findCollection(Project $project, int $collectionId): Collection|string
    {
        if ($collectionId <= 0) {
            return json_encode(['error' => 'collection_id is required.']);
        }

        $collection = Collection::where('id', $collectionId)
            ->where('project_id', $project->id)
            ->first();

        if (! $collection) {
            return json_encode(['error' => "Collection {$collectionId} not found in this project."]);
        }

        return $collection;
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'action' => $schema
                ->string()
                ->description('Action: list_fields, add_field, update_field, delete_field, update_collection')
                ->required(),
            'project_id' => $schema
                ->integer()
                ->description('Target project ID')
                ->required(),
            'collection_id' => $schema
                ->integer()
                ->description('Target collection ID'),
            'field_id' => $schema
                ->integer()
                ->description('Target field ID (for update_field/delete_field)'),
            'data' => $schema
                ->object([
                    // For add_field / update_field
                    'type' => $schema->string()
                        ->description('Field type: text, longtext, richtext, slug, email, password, number, enumeration, boolean, color, date, time, datetime, media, relation, json, group'),
                    'label' => $schema->string()
                        ->description('Field label (max 60 chars)'),
                    'name' => $schema->string()
                        ->description('For fields: name slug. For update_collection: the new collection name.'),
                    'description' => $schema->string()
                        ->description('Field or collection description'),
                    'required' => $schema->boolean()
                        ->description('Is field required?'),
                    'unique' => $schema->boolean()
                        ->description('Must values be unique?'),
                    'slug_field' => $schema->string()
                        ->description('For slug: source text field name'),
                    'slug_readonly' => $schema->boolean()
                        ->description('For slug: read-only'),
                    'relation_collection' => $schema->string()
                        ->description('For relation: target collection name or ID'),
                    'relation_type' => $schema->integer()
                        ->description('For relation: 1=oneToOne, 2=oneToMany'),
                    'media_type' => $schema->integer()
                        ->description('For media: 1=single, 2=multiple'),
                    'enumeration_list' => $schema->string()
                        ->description('For enumeration: comma-separated values'),
                    'multiple' => $schema->boolean()
                        ->description('For enumeration: allow multiple'),
                    'repeatable' => $schema->boolean()
                        ->description('Make field repeatable'),
                    'include_time' => $schema->boolean()
                        ->description('For date/datetime: include time'),
                    'children' => $schema->array()
                        ->items(CreateSchema::fieldObjectSchema($schema, false))
                        ->description('For group type: child fields'),
                ])
                ->description('Field or collection data for the operation'),
        ];
    }
}
