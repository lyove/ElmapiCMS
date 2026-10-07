<?php

namespace App\Http\Controllers;

use App\Ai\Agents\ContentTextAgent;
use App\Models\AppSetting;
use Illuminate\Http\Request;
use Laravel\Ai\Streaming\Events\StreamEnd;
use Laravel\Ai\Streaming\Events\TextDelta;

class ContentAiController extends Controller
{
    /**
     * Stream an AI content action response.
     */
    public function stream(Request $request)
    {
        $settings = AppSetting::query()->latest('id')->first();

        if (! $settings?->ai_enabled) {
            return response()->json(['message' => 'AI assistant is disabled.'], 403);
        }

        $request->validate([
            'action' => 'required|string|in:summarize,expand,rewrite,fix_grammar,generate,translate',
            'text' => 'nullable|string|max:50000',
            'prompt' => 'nullable|string|max:5000',
            'tone' => 'nullable|string|in:formal,casual,professional,friendly,concise',
            'target_locale' => 'nullable|string|max:10',
            'custom_instruction' => 'nullable|string|max:2000',
            'context' => 'nullable|array',
            'context.field_name' => 'nullable|string|max:200',
            'context.field_label' => 'nullable|string|max:200',
            'context.collection_name' => 'nullable|string|max:200',
            'context.other_fields' => 'nullable|string|max:10000',
            'context.content_format' => 'nullable|string|in:plain,html,markdown',
        ]);

        $providerName = $settings->ai_provider ?? 'anthropic';
        $providerConfig = config("ai.providers.{$providerName}");

        if (! $providerConfig || empty($providerConfig['key'])) {
            return response()->json([
                'message' => "The AI provider \"{$providerName}\" is not configured.",
            ], 422);
        }

        $action = $request->input('action');
        $text = $request->input('text') ?? '';
        $prompt = $request->input('prompt') ?? '';
        $tone = $request->input('tone') ?? 'professional';
        $targetLocale = $request->input('target_locale') ?? 'en';
        $customInstruction = $request->input('custom_instruction') ?? '';
        $context = $request->input('context', []);

        $systemPrompt = $this->buildSystemPrompt($action, $tone, $targetLocale, $customInstruction, $context);
        $userMessage = $this->buildUserMessage($action, $text, $prompt, $context);
        $maxTokens = $settings->ai_max_tokens ?? 4096;

        $driver = $providerConfig['driver'] ?? $providerName;
        $model = $settings->ai_model ?: null;

        $agent = new ContentTextAgent($systemPrompt, $maxTokens);

        $streamArgs = [
            'provider' => $providerName,
            'timeout' => 30,
        ];

        if ($model) {
            $streamArgs['model'] = $model;
        } else {
            $streamArgs['model'] = $this->defaultModelFor($driver);
        }

        return response()->stream(function () use ($agent, $userMessage, $action, $streamArgs) {
            try {
                $stream = $agent->stream($userMessage, ...$streamArgs);

                $usage = null;

                foreach ($stream as $event) {
                    if ($event instanceof TextDelta && $event->delta !== '') {
                        echo 'data: '.json_encode(['type' => 'delta', 'text' => $event->delta])."\n\n";

                        if (ob_get_level()) {
                            ob_flush();
                        }
                        flush();
                    }

                    if ($event instanceof StreamEnd) {
                        $usage = [
                            'prompt_tokens' => $event->usage->promptTokens,
                            'completion_tokens' => $event->usage->completionTokens,
                        ];
                    }
                }

                $donePayload = ['type' => 'done', 'action' => $action];
                if ($usage) {
                    $donePayload['usage'] = $usage;
                }
                echo 'data: '.json_encode($donePayload)."\n\n";
            } catch (\Throwable $e) {
                echo 'data: '.json_encode(['type' => 'error', 'message' => $e->getMessage()])."\n\n";
            }

            if (ob_get_level()) {
                ob_flush();
            }
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Build the system prompt for the given action.
     */
    protected function buildSystemPrompt(string $action, string $tone, string $targetLocale, string $customInstruction, array $context): string
    {
        $contextHint = '';
        if (! empty($context['collection_name'])) {
            $contextHint .= " The content belongs to a \"{$context['collection_name']}\" collection.";
        }
        if (! empty($context['field_label'])) {
            $contextHint .= " The field is \"{$context['field_label']}\".";
        }
        if (! empty($context['other_fields'])) {
            $contextHint .= "\n\nHere are the other fields in this content entry for reference:\n{$context['other_fields']}";
        }

        $customHint = '';
        if ($customInstruction && $action === 'rewrite') {
            $customHint = " Follow this instruction: {$customInstruction}";
        }

        $contentFormat = $context['content_format'] ?? 'plain';
        $translateModeHint = $contentFormat === 'html'
            ? ' The input may contain HTML markup. Preserve all HTML tags, attributes, and structure exactly; only translate visible text content between tags.'
            : '';
        $generateHtmlHint = $contentFormat === 'html'
            ? ' Output must be HTML fragments only: use tags such as <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, and <a href>. Do not wrap the answer in markdown code fences. Do not return JSON, Lexical editor state, or document wrappers (<html>, <head>, <body>).'
            : '';
        $generateMarkdownHint = $contentFormat === 'markdown'
            ? ' Output must be valid markdown only. Do not output HTML tags. Do not return JSON. Do not wrap the answer in markdown code fences.'
            : '';

        return match ($action) {
            'summarize' => "You are a content editor. Summarize the following text concisely while keeping the key points. Return only the summary, no explanations.{$contextHint}",
            'expand' => "You are a content editor. Expand and elaborate on the following text, adding more detail and depth. Keep the same tone and style. Return only the expanded text.{$contextHint}",
            'rewrite' => $customInstruction
                ? "You are a content editor. Rewrite the following text.{$customHint} Return only the rewritten text, no explanations.{$contextHint}"
                : "You are a content editor. Rewrite the following text in a {$tone} tone. Return only the rewritten text, no explanations.{$contextHint}",
            'fix_grammar' => "You are a proofreader. Fix grammar, spelling, and punctuation errors in the following text. Return only the corrected text with no explanations or comments.{$contextHint}",
            'generate' => "You are a content writer.{$contextHint}{$generateHtmlHint}{$generateMarkdownHint} Write content based on the user's instruction. Return only the content, no meta-commentary. Match the expected format for this field.",
            'translate' => "You are a translator. Translate the following text to {$targetLocale}.{$translateModeHint} Return only the translated text, no explanations.{$contextHint}",
            default => "You are a content editor.{$contextHint}",
        };
    }

    /**
     * Build the user message for the given action.
     */
    protected function buildUserMessage(string $action, ?string $text, ?string $prompt, array $context): string
    {
        return match ($action) {
            'generate' => $prompt ?: 'Write content for this field.',
            default => $text ?: $prompt ?: 'No text provided.',
        };
    }

    /**
     * Get a sensible default model for a driver.
     */
    protected function defaultModelFor(string $driver): string
    {
        return match ($driver) {
            'anthropic' => 'claude-sonnet-4-20250514',
            'openai' => 'gpt-4o-mini',
            'gemini' => 'gemini-2.0-flash',
            'deepseek' => 'deepseek-chat',
            'groq' => 'llama-3.1-8b-instant',
            'mistral' => 'mistral-small-latest',
            'xai' => 'grok-2',
            default => 'default',
        };
    }
}
