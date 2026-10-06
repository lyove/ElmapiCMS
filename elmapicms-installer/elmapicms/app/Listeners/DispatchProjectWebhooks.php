<?php

namespace App\Listeners;

use App\Events\ContentEvent;
use App\Http\Resources\ContentEntryResource;
use App\Jobs\SendWebhookJob;

class DispatchProjectWebhooks
{
    public function handle(ContentEvent $event): void
    {
        $project = $event->project;

        $collectionId = $event->contentEntry->collection_id;
        $webhooks = $project->webhooks()->with('collections:id')->where('status', true)->get();

        foreach ($webhooks as $webhook) {
            // Check event match
            if (! in_array($event->name, $webhook->events ?? [])) {
                continue;
            }
            // Check source match
            if (! in_array($event->source, $webhook->sources ?? [])) {
                continue;
            }
            // Check collection filter via pivot table
            $webhookCollectionIds = $webhook->collections->pluck('id')->all();
            if (! empty($webhookCollectionIds) && ! in_array($collectionId, $webhookCollectionIds, true)) {
                continue;
            }

            $payload = [
                'event' => $event->name,
                'project_uuid' => $project->uuid,
                'collection_id' => $event->contentEntry->collection_id,
                'content_id' => $event->contentEntry->id,
            ];

            if (
                $webhook->payload
                && in_array($event->name, [
                    'content.created',
                    'content.updated',
                    'content.published',
                    'content.unpublished',
                    'content.trashed',
                    'content.restored',
                ], true)
            ) {
                $entry = $event->contentEntry->load([
                    'fieldValues.field',
                    'fieldValues.mediaRelations.asset.metadata',
                    'fieldValues.valueRelations.related',
                ]);
                $payload['content_entry'] = ContentEntryResource::make($entry)->resolve();
            }

            SendWebhookJob::dispatch($webhook, $payload)->onQueue('webhooks');
        }
    }
}
