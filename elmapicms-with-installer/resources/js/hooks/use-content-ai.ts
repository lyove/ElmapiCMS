/**
 * Shared hook for inline content AI streaming actions.
 *
 * Used by AiFieldButton (text/longtext) and Lexical AI plugins.
 */

function getXsrfToken(): string {
    const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
    return token ? decodeURIComponent(token) : '';
}

export type ContentAiAction =
    | 'summarize'
    | 'expand'
    | 'rewrite'
    | 'fix_grammar'
    | 'generate'
    | 'translate';

export interface ContentAiContext {
    field_name?: string;
    field_label?: string;
    collection_name?: string;
    other_fields?: string;
    content_format?: 'plain' | 'html' | 'markdown';
}

export interface ContentAiUsage {
    prompt_tokens: number;
    completion_tokens: number;
}

export interface ContentAiDoneInfo {
    action?: string;
    usage?: ContentAiUsage;
}

export interface StreamContentAiParams {
    action: ContentAiAction;
    text?: string;
    prompt?: string;
    tone?: string;
    target_locale?: string;
    custom_instruction?: string;
    context?: ContentAiContext;
    onDelta: (text: string) => void;
    onDone: (info?: ContentAiDoneInfo) => void;
    onError: (error: string) => void;
    signal?: AbortSignal;
}

/**
 * Stream an AI content action from the backend.
 * Returns a promise that resolves when the stream completes.
 */
export async function streamContentAi(params: StreamContentAiParams): Promise<void> {
    const { action, text, prompt, tone, target_locale, custom_instruction, context, onDelta, onDone, onError, signal } = params;

    try {
        const response = await fetch('/ai/content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'X-XSRF-TOKEN': getXsrfToken(),
            },
            body: JSON.stringify({
                action,
                text: text || '',
                prompt: prompt || '',
                tone: tone || undefined,
                target_locale: target_locale || undefined,
                custom_instruction: custom_instruction || undefined,
                context: context || undefined,
            }),
            signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
            onError(errorData.message || `Error ${response.status}`);
            return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
            onError('No response stream available');
            return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;

                try {
                    const parsed = JSON.parse(jsonStr);

                    if (parsed.type === 'delta' && parsed.text) {
                        onDelta(parsed.text);
                    } else if (parsed.type === 'done') {
                        onDone({
                            action: parsed.action,
                            usage: parsed.usage,
                        });
                        return;
                    } else if (parsed.type === 'error') {
                        onError(parsed.message || 'Unknown error');
                        return;
                    }
                } catch {
                    // Skip malformed JSON
                }
            }
        }

        // If stream ended without explicit done event
        onDone();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            // Silently handle aborts
            return;
        }
        onError(error instanceof Error ? error.message : 'Stream failed');
    }
}
