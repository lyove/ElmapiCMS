<?php

namespace Tests\Feature\Content;

use App\Models\Asset;
use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\ContentFieldValue;
use App\Models\Field;
use App\Models\Project;
use App\Models\User;
use Spatie\Permission\Models\Permission;

class ContentCreationTestSupport
{
    public static function grantPermission(User $user, string $permission): void
    {
        Permission::findOrCreate($permission, 'web');
        $user->givePermissionTo($permission);
    }

    public static function grantPermissions(User $user, array $permissions): void
    {
        foreach ($permissions as $permission) {
            self::grantPermission($user, $permission);
        }
    }

    public static function grantCreateContentPermission(User $user): void
    {
        self::grantPermission($user, 'create_content');
    }

    public static function grantUpdateContentPermission(User $user): void
    {
        self::grantPermission($user, 'update_content');
    }

    public static function createProjectAndCollection(User $user): array
    {
        $project = Project::factory()->create([
            'default_locale' => 'en',
            'locales' => ['en', 'tr'],
        ]);
        $project->members()->attach($user->id);

        $collection = $project->collections()->create([
            'name' => 'Articles',
            'slug' => 'articles',
            'order' => 1,
            'is_singleton' => false,
        ]);

        return [$project, $collection];
    }

    public static function createField(Project $project, Collection $collection, array $attributes): Field
    {
        return $collection->allFields()->create([
            'project_id' => $project->id,
            'type' => 'text',
            'label' => 'Field',
            'name' => 'field',
            'description' => null,
            'placeholder' => null,
            'options' => [],
            'validations' => [],
            'order' => 1,
            ...$attributes,
        ]);
    }

    public static function createAsset(Project $project, User $user, string $filename): Asset
    {
        return Asset::create([
            'project_id' => $project->id,
            'filename' => $filename,
            'original_filename' => $filename,
            'mime_type' => 'image/jpeg',
            'extension' => 'jpg',
            'size' => 1024,
            'disk' => 'public',
            'path' => 'projects/'.$project->uuid.'/'.$filename,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
    }

    public static function createRelationCollectionWithEntries(Project $project, User $user): array
    {
        $collection = $project->collections()->create([
            'name' => 'Authors',
            'slug' => 'authors',
            'order' => 2,
            'is_singleton' => false,
        ]);

        $entryA = ContentEntry::create([
            'project_id' => $project->id,
            'collection_id' => $collection->id,
            'locale' => 'en',
            'state' => 'published',
            'created_by' => $user->id,
            'updated_by' => $user->id,
            'published_at' => now(),
        ]);

        $entryB = ContentEntry::create([
            'project_id' => $project->id,
            'collection_id' => $collection->id,
            'locale' => 'en',
            'state' => 'draft',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        return [$collection, $entryA, $entryB];
    }

    public static function createContentEntry(Project $project, Collection $collection, User $user, array $attributes = []): ContentEntry
    {
        return ContentEntry::create([
            'project_id' => $project->id,
            'collection_id' => $collection->id,
            'locale' => 'en',
            'state' => $attributes['state'] ?? 'draft',
            'created_by' => $user->id,
            'updated_by' => $user->id,
            ...$attributes,
        ]);
    }

    public static function createFieldValue(ContentEntry $entry, Field $field, array $values): ContentFieldValue
    {
        return ContentFieldValue::create([
            'project_id' => $entry->project_id,
            'collection_id' => $entry->collection_id,
            'content_entry_id' => $entry->id,
            'field_id' => $field->id,
            'field_type' => $field->type,
            ...$values,
        ]);
    }
}
