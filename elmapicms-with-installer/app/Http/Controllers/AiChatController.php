<?php

namespace App\Http\Controllers;

use App\Ai\Agents\ElmapiAssistant;
use App\Models\AppSetting;
use App\Models\Collection;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Laravel\Ai\Exceptions\AiException;
use Laravel\Ai\Streaming\Events\ToolResult;

class AiChatController extends Controller
{
    /**
     * Stream a response from the AI assistant.
     */
    public function stream(Request $request)
    {
        $settings = AppSetting::query()->latest('id')->first();

        if (! $settings?->ai_enabled) {
            return response()->json(['message' => 'AI assistant is disabled. Enable it in App Settings > AI.'], 403);
        }

        $request->validate([
            'message' => 'required|string|max:10000',
            'conversation_id' => 'nullable|string',
            'current_url' => 'nullable|string|max:500',
        ]);

        $provider = $settings->ai_provider ?? 'anthropic';
        $providerConfig = config("ai.providers.{$provider}");

        if (! $providerConfig || empty($providerConfig['key'])) {
            return response()->json([
                'message' => "The AI provider \"{$provider}\" is not configured. Add the API key to your .env file.",
            ], 422);
        }

        try {
            // Load existing conversation context (active project, etc.)
            $conversationContext = [];
            if ($request->conversation_id) {
                $conv = \DB::table('agent_conversations')
                    ->where('id', $request->conversation_id)
                    ->first(['context']);
                if ($conv?->context) {
                    $conversationContext = json_decode($conv->context, true) ?: [];
                }
            }

            $agent = new ElmapiAssistant(
                currentUrl: $request->input('current_url', '/'),
                conversationContext: $conversationContext,
            );
            $user = $request->user();

            if ($request->conversation_id) {
                $agent->continue($request->conversation_id, as: $user);
            } else {
                $agent->forUser($user);
            }

            $model = $settings->ai_model ?: null;

            $streamArgs = [
                'provider' => $provider,
            ];

            if ($model) {
                $streamArgs['model'] = $model;
            }

            $stream = $agent->stream($request->message, ...$streamArgs);

            // Manually stream so we can inject custom events
            return response()->stream(function () use ($stream, $agent, $conversationContext) {
                $trackedProjectId = null;
                $trackedCollectionId = null;

                foreach ($stream as $event) {
                    echo 'data: '.((string) $event)."\n\n";

                    // Track project context from tool results
                    if ($event instanceof ToolResult) {
                        $toolName = $event->toolResult->name;
                        $toolArgs = $event->toolResult->arguments;

                        // Extract project_id from tool arguments
                        $projectTools = ['CreateSchema', 'ManageSchema', 'ManageProject', 'ManageContent', 'SearchProjects'];
                        if (in_array($toolName, $projectTools) && ! empty($toolArgs['project_id'])) {
                            $trackedProjectId = (int) $toolArgs['project_id'];
                        }

                        // Track collection from ManageContent tool arguments
                        if ($toolName === 'ManageContent' && ! empty($toolArgs['collection'])) {
                            $collInput = $toolArgs['collection'];
                            $col = Collection::where('project_id', $trackedProjectId ?? 0)
                                ->where(function ($q) use ($collInput) {
                                    $q->where('id', is_numeric($collInput) ? (int) $collInput : 0)
                                        ->orWhere('slug', $collInput)
                                        ->orWhere('name', $collInput);
                                })->first();
                            if ($col) {
                                $trackedCollectionId = $col->id;
                            }
                        }

                        // For CreateProject, extract project id from the result
                        if ($toolName === 'CreateProject') {
                            $createResult = $event->toolResult->result;
                            if (is_string($createResult)) {
                                $decoded = json_decode($createResult, true);
                                if (! empty($decoded['id'])) {
                                    $trackedProjectId = (int) $decoded['id'];
                                }
                            }
                        }

                        // Detect navigation/reload tool results and inject clean events
                        $result = $event->toolResult->result;
                        if (is_string($result)) {
                            $decoded = json_decode($result, true);
                            if (is_array($decoded)) {
                                $action = $decoded['action'] ?? null;
                                if ($action === 'navigate' && ! empty($decoded['url'])) {
                                    // Track project and collection from navigation URL
                                    if (preg_match('#/projects/(\d+)#', $decoded['url'], $m)) {
                                        $trackedProjectId = (int) $m[1];
                                    }
                                    if (preg_match('#/collections/(\d+)#', $decoded['url'], $cm)) {
                                        $trackedCollectionId = (int) $cm[1];
                                    }

                                    echo 'data: '.json_encode([
                                        'type' => 'navigate',
                                        'url' => $decoded['url'],
                                    ])."\n\n";
                                } elseif ($action === 'reload') {
                                    echo 'data: '.json_encode([
                                        'type' => 'reload',
                                    ])."\n\n";
                                }
                            }
                        }
                    }

                    if (ob_get_level()) {
                        ob_flush();
                    }
                    flush();
                }

                // Send conversation ID as a custom event after streaming completes
                $conversationId = $agent->currentConversation();
                if ($conversationId) {
                    // Save tracked project and collection context to the conversation
                    if ($trackedProjectId) {
                        $project = Project::find($trackedProjectId);
                        if ($project) {
                            $conversationContext['active_project_id'] = $project->id;
                            $conversationContext['active_project_name'] = $project->name;
                        }
                    }

                    if ($trackedCollectionId) {
                        $col = Collection::find($trackedCollectionId);
                        if ($col) {
                            $conversationContext['active_collection_id'] = $col->id;
                            $conversationContext['active_collection_name'] = $col->name;
                        }
                    }

                    if (! empty($conversationContext)) {
                        \DB::table('agent_conversations')
                            ->where('id', $conversationId)
                            ->update(['context' => json_encode($conversationContext)]);
                    }

                    echo 'data: '.json_encode([
                        'type' => 'conversation_id',
                        'conversation_id' => $conversationId,
                    ])."\n\n";
                    if (ob_get_level()) {
                        ob_flush();
                    }
                    flush();
                }

                echo "data: [DONE]\n\n";
                if (ob_get_level()) {
                    ob_flush();
                }
                flush();
            }, 200, ['Content-Type' => 'text/event-stream', 'Cache-Control' => 'no-cache', 'X-Accel-Buffering' => 'no']);
        } catch (AiException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 502);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Something went wrong while communicating with the AI provider. Check the logs for details.',
            ], 500);
        }
    }

    /**
     * List conversations for the authenticated user.
     */
    public function conversations(Request $request)
    {
        $conversations = \DB::table('agent_conversations')
            ->where('participant_type', User::class)
            ->where('participant_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get(['id', 'title', 'created_at', 'updated_at'])
            ->map(fn ($conversation) => [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'created_at' => Carbon::parse($conversation->created_at, 'UTC')->toIso8601String(),
                'updated_at' => Carbon::parse($conversation->updated_at, 'UTC')->toIso8601String(),
            ]);

        return response()->json($conversations);
    }

    /**
     * Get messages for a specific conversation.
     */
    public function messages(Request $request, string $conversationId)
    {
        // Verify the conversation belongs to the authenticated user
        $conversation = \DB::table('agent_conversations')
            ->where('id', $conversationId)
            ->where('participant_type', User::class)
            ->where('participant_id', $request->user()->id)
            ->first();

        if (! $conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        $messages = \DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversationId)
            ->orderBy('created_at')
            ->get(['id', 'role', 'content', 'usage', 'tool_calls', 'tool_results', 'created_at'])
            ->map(function ($m) {
                $row = [
                    'role' => $m->role,
                    'content' => $m->content,
                    'usage' => $m->role === 'assistant' ? json_decode($m->usage, true) : null,
                ];
                if ($m->role === 'assistant') {
                    $row['parts'] = $this->buildAssistantPartsForMessage($m->content, $m->tool_calls, $m->tool_results);
                }

                return $row;
            });

        return response()->json([
            'conversation' => [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'created_at' => Carbon::parse($conversation->created_at, 'UTC')->toIso8601String(),
                'updated_at' => Carbon::parse($conversation->updated_at, 'UTC')->toIso8601String(),
            ],
            'messages' => $messages,
        ]);
    }

    /**
     * Delete a conversation and its messages.
     */
    public function destroyConversation(Request $request, string $conversationId)
    {
        $conversation = \DB::table('agent_conversations')
            ->where('id', $conversationId)
            ->where('participant_type', User::class)
            ->where('participant_id', $request->user()->id)
            ->first();

        if (! $conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        \DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversationId)
            ->delete();

        \DB::table('agent_conversations')
            ->where('id', $conversationId)
            ->delete();

        return response()->json(['message' => 'Conversation deleted.']);
    }

    /**
     * Build ordered UI parts for an assistant message (text first, then tools in call order).
     *
     * @return array<int, array{type: string, content?: string, step?: array<string, mixed>}>
     */
    private function buildAssistantPartsForMessage(?string $content, ?string $toolCallsJson, ?string $toolResultsJson): array
    {
        $content = $content ?? '';
        $calls = json_decode($toolCallsJson ?? '[]', true);
        $results = json_decode($toolResultsJson ?? '[]', true);

        if (! is_array($calls)) {
            $calls = [];
        }
        if (! is_array($results)) {
            $results = [];
        }

        $calls = array_values(array_filter(
            $calls,
            fn ($c) => is_array($c) && ($c['name'] ?? '') !== 'output_structured_data'
        ));

        $parts = [];

        if ($content !== '') {
            $parts[] = ['type' => 'text', 'content' => $content];
        }

        $resultsPool = array_values($results);

        foreach ($calls as $tc) {
            if (! is_array($tc)) {
                continue;
            }

            $name = (string) ($tc['name'] ?? '');
            $callId = $tc['id'] ?? null;
            $matched = null;
            $matchedIdx = null;

            foreach ($resultsPool as $idx => $r) {
                if (! is_array($r)) {
                    continue;
                }
                $rid = $r['id'] ?? null;
                $resId = $r['result_id'] ?? null;
                if ($callId !== null && ($resId === $callId || $rid === ($tc['result_id'] ?? null))) {
                    $matched = $r;
                    $matchedIdx = $idx;
                    break;
                }
            }

            if ($matched === null) {
                foreach ($resultsPool as $idx => $r) {
                    if (! is_array($r)) {
                        continue;
                    }
                    if (($r['name'] ?? '') === $name) {
                        $matched = $r;
                        $matchedIdx = $idx;
                        break;
                    }
                }
            }

            if ($matchedIdx !== null) {
                unset($resultsPool[$matchedIdx]);
                $resultsPool = array_values($resultsPool);
            }

            $resultStr = '';
            if ($matched !== null) {
                $res = $matched['result'] ?? '';
                $resultStr = is_string($res) ? $res : json_encode($res);
            }

            $isError = false;
            if ($resultStr !== '') {
                try {
                    $decoded = json_decode($resultStr, true, 512, JSON_THROW_ON_ERROR);
                    if (is_array($decoded) && ! empty($decoded['error'])) {
                        $isError = true;
                    }
                } catch (\JsonException) {
                    // ignore
                }
            }

            $parts[] = [
                'type' => 'tool',
                'step' => [
                    'toolName' => $name,
                    'status' => $isError ? 'error' : 'done',
                    'result' => $resultStr,
                ],
            ];
        }

        return $parts;
    }
}
