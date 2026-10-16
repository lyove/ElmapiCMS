<?php

namespace App\Services;

use App\Models\Collection;
use App\Models\ContentEntry;
use App\Models\Project;
use App\Support\ContentEntryWebhookNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ContentEntryTranslationService
{
    /**
     * Merge two entries into the same translation group (same behavior as dashboard link-translation).
     * The first entry acts as the anchor: its group id is canonical when merging.
     */
    public function linkTwoEntries(ContentEntry $anchor, ContentEntry $other, string $source = 'cms'): void
    {
        if ($anchor->id === $other->id) {
            return;
        }

        if ($anchor->locale === $other->locale) {
            return;
        }

        $mutated = false;

        DB::transaction(function () use ($anchor, $other, &$mutated) {
            $anchor->refresh();
            $other->refresh();

            if (! $anchor->translation_group_id) {
                $anchor->translation_group_id = (string) Str::uuid();
                $anchor->save();
                $mutated = true;
            }

            if ($other->translation_group_id) {
                if ($other->translation_group_id === $anchor->translation_group_id) {
                    return;
                }

                ContentEntry::query()
                    ->where('translation_group_id', $other->translation_group_id)
                    ->update(['translation_group_id' => $anchor->translation_group_id]);
                $mutated = true;
            } else {
                $other->translation_group_id = $anchor->translation_group_id;
                $other->save();
                $mutated = true;
            }
        });

        if (! $mutated) {
            return;
        }

        $anchor->refresh();
        $groupId = $anchor->translation_group_id;

        if (! $groupId) {
            return;
        }

        $project = Project::query()->find($anchor->project_id);

        if (! $project) {
            return;
        }

        ContentEntryWebhookNotifier::dispatchContentUpdatedForTranslationGroup(
            $project,
            $anchor->collection_id,
            $groupId,
            $source,
        );
    }

    /**
     * For singleton collections: after creating an entry, join it to the translation group of any
     * existing entry in another locale (prefer project default locale, then lowest id).
     */
    public function autoLinkSingletonNewEntry(Project $project, Collection $collection, ContentEntry $newEntry): void
    {
        if (! $collection->is_singleton) {
            return;
        }

        $defaultLocale = $project->default_locale;

        $query = $collection->contentEntries()
            ->where('id', '!=', $newEntry->id)
            ->where('locale', '!=', $newEntry->locale);

        if ($defaultLocale) {
            $query->orderByRaw('CASE WHEN locale = ? THEN 0 ELSE 1 END', [$defaultLocale]);
        }

        $anchor = $query->orderBy('id')->first();

        if (! $anchor) {
            return;
        }

        $this->linkTwoEntries($anchor, $newEntry);
    }
}
