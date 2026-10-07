<?php

namespace App\Listeners;

use App\Events\ProjectAuthEvent;
use App\Jobs\SendWebhookJob;

class DispatchProjectAuthWebhooks
{
    public function handle(ProjectAuthEvent $event): void
    {
        $project = $event->project;
        $source = 'api';
        $webhooks = $project->webhooks()->where('status', true)->get();

        foreach ($webhooks as $webhook) {
            if (! in_array($event->name, $webhook->events ?? [])) {
                continue;
            }

            if (! in_array($source, $webhook->sources ?? [])) {
                continue;
            }

            $payload = [
                'event' => $event->name,
                'source' => $source,
                'project_uuid' => $project->uuid,
            ];

            if ($event->authUser) {
                $payload['auth_user_uuid'] = $event->authUser->uuid;
                $payload['auth_user_email'] = $event->authUser->email;
            }

            SendWebhookJob::dispatch($webhook, $payload)->onQueue('webhooks');
        }
    }
}
