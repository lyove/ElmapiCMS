<?php

namespace App\Jobs;

use App\Models\Webhook;
use App\Models\WebhookLog;
use App\Services\Webhooks\WebhookUrlSafety;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class SendWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public Webhook $webhook;

    public array $payload;

    public function __construct(Webhook $webhook, array $payload)
    {
        $this->webhook = $webhook;
        $this->payload = $payload;
    }

    public function handle(): void
    {
        $payload = $this->preparePayload($this->payload);

        try {
            WebhookUrlSafety::assertSafe($this->webhook->url);
        } catch (InvalidArgumentException $e) {
            $this->createLog($payload, 'blocked', $e->getMessage());

            return;
        }

        $signature = null;
        if ($this->webhook->secret) {
            $signature = hash_hmac('sha256', json_encode($payload), $this->webhook->secret);
        }

        try {
            $response = Http::timeout(10)
                ->withOptions(['allow_redirects' => false])
                ->withHeaders($signature ? ['X-Webhook-Signature' => $signature] : [])
                ->post($this->webhook->url, $payload);

            $statusCode = (int) $response->status();
            $status = (string) $statusCode;
            $responseBody = $response->body();
        } catch (Throwable $e) {
            $this->createLog($payload, 'error', $e->getMessage());

            throw $e;
        }

        $this->createLog($payload, $status, $responseBody);

        if (! $response->successful()) {
            if ($statusCode === 429 || ! $response->clientError()) {
                throw new RuntimeException("Webhook endpoint returned retryable status {$status}.");
            }

            return;
        }
    }

    public int $tries = 3;

    public int $backoff = 30; // seconds

    private function preparePayload(array $payload): array
    {
        $payload['timestamp'] ??= now()->toIso8601String();
        $payload['delivery_id'] ??= (string) Str::uuid();

        return $payload;
    }

    private function createLog(array $payload, string $status, string $responseBody): void
    {
        $maxBody = max(1, (int) config('webhooks.log_response_body_max_bytes', 8192));
        $truncatedBody = strlen($responseBody) <= $maxBody
            ? $responseBody
            : substr($responseBody, 0, $maxBody).'…';

        WebhookLog::create([
            'project_uuid' => $payload['project_uuid'] ?? $this->webhook->project?->uuid,
            'webhook_id' => $this->webhook->id,
            'action' => $payload['event'] ?? 'unknown',
            'url' => $this->webhook->url,
            'status' => $status,
            'request' => $this->shrinkPayloadForLog($payload),
            'response' => [
                'status' => $status,
                'body' => $truncatedBody,
                'body_truncated' => strlen($responseBody) > $maxBody,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function shrinkPayloadForLog(array $payload): array
    {
        $maxBytes = max(1, (int) config('webhooks.log_request_json_max_bytes', 65536));
        $json = json_encode($payload);
        if ($json !== false && strlen($json) <= $maxBytes) {
            return $payload;
        }

        $trimmed = $payload;
        unset($trimmed['content_entry']);
        $trimmed['content_entry'] = [
            '_omitted' => true,
            'reason' => 'request payload exceeded log size limit',
        ];

        $json = json_encode($trimmed);
        if ($json !== false && strlen($json) <= $maxBytes) {
            return $trimmed;
        }

        return [
            'event' => $payload['event'] ?? null,
            'project_uuid' => $payload['project_uuid'] ?? null,
            'collection_id' => $payload['collection_id'] ?? null,
            'content_id' => $payload['content_id'] ?? null,
            'delivery_id' => $payload['delivery_id'] ?? null,
            'timestamp' => $payload['timestamp'] ?? null,
            '_webhook_log_truncated' => true,
        ];
    }
}
