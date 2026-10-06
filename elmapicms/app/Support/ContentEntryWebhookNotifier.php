<?php

namespace App\Support;

use App\Events\ContentEvent;
use App\Models\ContentEntry;
use App\Models\Project;

class ContentEntryWebhookNotifier
{
    public static function dispatch(string $eventName, Project $project, ContentEntry $entry, string $source = 'cms'): void
    {
        $entry->load([
            'fieldValues.field',
            'fieldValues.mediaRelations.asset.metadata',
            'fieldValues.valueRelations.related',
            'fieldGroups.fieldValues.field',
            'fieldGroups.fieldValues.mediaRelations.asset.metadata',
            'fieldGroups.fieldValues.valueRelations.related',
        ]);

        event(new ContentEvent($eventName, $project, $entry, $source));
    }

    public static function dispatchContentUpdatedForTranslationGroup(
        Project $project,
        int $collectionId,
        string $translationGroupId,
        string $source = 'cms'
    ): void {
        $entries = ContentEntry::query()
            ->where('project_id', $project->id)
            ->where('collection_id', $collectionId)
            ->where('translation_group_id', $translationGroupId)
            ->get();

        foreach ($entries as $entry) {
            self::dispatch('content.updated', $project, $entry, $source);
        }
    }
}
