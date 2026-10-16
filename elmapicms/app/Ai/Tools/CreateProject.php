<?php

namespace App\Ai\Tools;

use App\Models\Collection;
use App\Models\Field;
use App\Models\Project;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;

class CreateProject implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): string
    {
        return 'Create a new project, optionally with collections and fields in a single call.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): string
    {
        $user = auth()->user();

        if (! $user->can('create_project')) {
            return json_encode(['error' => 'You do not have permission to create projects.']);
        }

        $name = trim((string) $request->string('name'));
        $defaultLocale = trim((string) $request->string('default_locale')) ?: 'en';
        $localesRaw = trim((string) $request->string('locales'));
        $description = trim((string) $request->string('description')) ?: null;

        if ($name === '') {
            return json_encode(['error' => 'Project name is required.']);
        }

        if (strlen($name) > 255) {
            return json_encode(['error' => 'Project name must be 255 characters or less.']);
        }

        // Reject special characters (same regex as ProjectController)
        if (preg_match('/[#$%^&*()+=\-\[\]\';,\/{}|":<>?~\\\\]/', $name)) {
            return json_encode(['error' => 'Project name contains invalid special characters.']);
        }

        // Build locales array: start with default, add any extras
        $locales = [$defaultLocale];
        if ($localesRaw !== '') {
            $extra = array_map('trim', explode(',', $localesRaw));
            foreach ($extra as $loc) {
                if ($loc !== '' && ! in_array($loc, $locales)) {
                    $locales[] = $loc;
                }
            }
        }

        // Parse collections — accept typed array (new) or JSON string (fallback)
        $collections = self::parseCollectionsInput($request['collections'] ?? null);

        // Create everything in a single transaction
        $result = DB::transaction(function () use ($user, $name, $description, $defaultLocale, $locales, $collections) {
            $project = Project::create([
                'name' => $name,
                'description' => $description,
                'default_locale' => $defaultLocale,
                'locales' => $locales,
                'public_api' => false,
                'disk' => 'public',
            ]);

            // Attach creator as member
            if (! $user->projects()->where('projects.id', $project->id)->exists() && ! $user->can('access_all_projects')) {
                $project->members()->attach($user->id);
            }

            $collectionsCreated = [];

            if (! empty($collections)) {
                // First pass: create all collections so we have IDs for relations
                $collectionModels = [];
                $collectionOrder = 0;

                foreach ($collections as $colDef) {
                    $colName = trim($colDef['name'] ?? '');
                    if ($colName === '') {
                        continue;
                    }

                    $colSlug = Str::slug($colName);
                    if ($colSlug === '' || in_array($colSlug, ['collections', 'files'])) {
                        continue;
                    }

                    // Skip if duplicate slug
                    if (Collection::where('project_id', $project->id)->where('slug', $colSlug)->exists()) {
                        continue;
                    }

                    $collectionOrder++;
                    $collection = $project->collections()->create([
                        'name' => $colName,
                        'slug' => $colSlug,
                        'is_singleton' => (bool) ($colDef['is_singleton'] ?? false),
                        'order' => $collectionOrder,
                    ]);

                    $collectionModels[$colSlug] = $collection;
                    $collectionModels[strtolower($colName)] = $collection;
                }

                // Second pass: create fields for each collection
                // Now all collections exist, so relation fields can reference them
                foreach ($collections as $colDef) {
                    $colName = trim($colDef['name'] ?? '');
                    $colSlug = Str::slug($colName);

                    $collection = $collectionModels[$colSlug] ?? null;
                    if (! $collection) {
                        continue;
                    }

                    $fields = $colDef['fields'] ?? [];
                    if (! is_array($fields) || empty($fields)) {
                        $collectionsCreated[] = [
                            'collection_id' => $collection->id,
                            'name' => $collection->name,
                            'fields_created' => 0,
                        ];

                        continue;
                    }

                    $fieldsCreated = $this->createFields($fields, $project, $collection, $collectionModels);

                    $collectionsCreated[] = [
                        'collection_id' => $collection->id,
                        'name' => $collection->name,
                        'fields_created' => $fieldsCreated,
                    ];
                }
            }

            return [
                'id' => $project->id,
                'name' => $project->name,
                'locales' => $project->locales,
                'default_locale' => $project->default_locale,
                'collections' => $collectionsCreated,
                'action' => 'navigate',
                'url' => "/projects/{$project->id}",
            ];
        });

        return json_encode($result);
    }

    /**
     * Parse a collections input that may be a typed array or a JSON string (fallback).
     * Applies flatToFieldData conversion to each collection's fields.
     */
    protected static function parseCollectionsInput(mixed $input): array
    {
        $collections = [];

        if (is_array($input)) {
            $collections = $input;
        } elseif (is_string($input)) {
            $input = trim($input);
            if ($input !== '') {
                $decoded = json_decode($input, true);
                if (is_array($decoded)) {
                    $collections = $decoded;
                }
            }
        }

        // Convert flat field format to nested for each collection's fields
        foreach ($collections as &$col) {
            if (isset($col['fields']) && is_array($col['fields'])) {
                $col['fields'] = array_map([CreateSchema::class, 'flatToFieldData'], $col['fields']);
            }
        }

        return $collections;
    }

    /**
     * Create field records, resolving slug and relation references.
     */
    protected function createFields(array $fields, Project $project, Collection $collection, array $collectionModels): int
    {
        $count = 0;

        foreach ($fields as $i => $fieldData) {
            // Normalize: move misplaced option keys into 'options'
            $fieldData = CreateSchema::normalizeFieldData($fieldData);

            $type = $fieldData['type'] ?? 'text';
            $label = $fieldData['label'] ?? '';
            $name = $fieldData['name'] ?? Str::slug($label);

            if (! in_array($type, CreateSchema::FIELD_TYPES) || $label === '') {
                continue;
            }

            $rawOptions = $fieldData['options'] ?? [];

            // Use shared resolver: handles slug field refs and relation collection refs
            CreateSchema::resolveOptions($rawOptions, $type, $project, $collection, $fields);

            $options = CreateSchema::buildOptions($type, $rawOptions);
            $validations = CreateSchema::buildValidations($fieldData['validations'] ?? []);

            $order = $collection->fields()->max('order') + 1;

            $field = Field::create([
                'type' => $type,
                'label' => $label,
                'name' => $name,
                'description' => $fieldData['description'] ?? null,
                'placeholder' => $fieldData['placeholder'] ?? null,
                'options' => $options,
                'validations' => $validations,
                'project_id' => $project->id,
                'collection_id' => $collection->id,
                'parent_field_id' => null,
                'order' => $order,
            ]);

            $count++;

            // Create children for group fields
            if ($type === 'group' && ! empty($fieldData['children'])) {
                foreach ($fieldData['children'] as $ci => $childData) {
                    // Normalize child data too
                    $childData = CreateSchema::normalizeFieldData($childData);

                    $childType = $childData['type'] ?? 'text';
                    $childLabel = $childData['label'] ?? '';
                    $childName = $childData['name'] ?? Str::slug($childLabel);

                    $childRawOptions = $childData['options'] ?? [];
                    CreateSchema::resolveOptions($childRawOptions, $childType, $project, $collection, $fieldData['children']);

                    $childOptions = CreateSchema::buildOptions($childType, $childRawOptions);
                    $childValidations = CreateSchema::buildValidations($childData['validations'] ?? []);

                    Field::create([
                        'type' => $childType,
                        'label' => $childLabel,
                        'name' => $childName,
                        'description' => $childData['description'] ?? null,
                        'placeholder' => $childData['placeholder'] ?? null,
                        'options' => $childOptions,
                        'validations' => $childValidations,
                        'project_id' => $project->id,
                        'collection_id' => $collection->id,
                        'parent_field_id' => $field->id,
                        'order' => $ci + 1,
                    ]);
                    $count++;
                }
            }
        }

        return $count;
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema
                ->string()
                ->description('Project name (max 255 chars, no special characters)')
                ->required(),
            'default_locale' => $schema
                ->string()
                ->description('Default locale code, e.g. "en", "tr", "de". Defaults to "en".')
                ->required(),
            'locales' => $schema
                ->string()
                ->description('Comma-separated additional locale codes, e.g. "de,tr,fr". The default_locale is always included.'),
            'description' => $schema
                ->string()
                ->description('Optional project description'),
            'collections' => $schema
                ->array()
                ->items($schema->object([
                    'name' => $schema->string()
                        ->description('Collection name')
                        ->required(),
                    'is_singleton' => $schema->boolean()
                        ->description('Single-entry collection'),
                    'fields' => $schema->array()
                        ->items(CreateSchema::fieldObjectSchema($schema))
                        ->description('Fields for this collection'),
                ]))
                ->description('Collections to create with the project'),
        ];
    }
}
