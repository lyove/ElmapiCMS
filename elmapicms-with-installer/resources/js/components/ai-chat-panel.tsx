import { useAiChat, type AiChatMessage, type AiChatPart, type AiConversation, type TokenUsage, type ToolStep } from '@/hooks/use-ai-chat';
import { useIsBelowLg } from '@/hooks/use-mobile';
import { formatRelativeFromNow } from '@/lib/date';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types/index.d';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { router, usePage } from '@inertiajs/react';
import { BotMessageSquare, Check, Copy, History, Loader2, MessageSquarePlus, Send, Trash2, Wrench, X, XCircle } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 320;
const MAX_WIDTH = 700;

// ── Markdown components ────────────────────────────────────────────────

function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
    const [copied, setCopied] = useState(false);
    const codeText = String(children).replace(/\n$/, '');
    const language = className?.replace('language-', '') || '';

    const handleCopy = () => {
        navigator.clipboard.writeText(codeText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group/code relative my-2 overflow-hidden rounded-lg border">
            <div className="bg-muted/80 flex items-center justify-between px-3 py-1.5">
                <span className="text-muted-foreground text-[11px] font-medium uppercase">{language || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] transition-colors"
                >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="overflow-x-auto p-2.5 text-xs leading-relaxed">
                <code className={className}>{codeText}</code>
            </pre>
        </div>
    );
}

const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    ul: ({ children }) => <ul className="mb-1.5 ml-3.5 list-disc space-y-0.5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-1.5 ml-3.5 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="pl-0.5">{children}</li>,
    h1: ({ children }) => <h1 className="mb-1.5 text-sm font-bold">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-1.5 text-[13px] font-bold">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-1 text-[13px] font-semibold">{children}</h3>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
            {children}
        </a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-primary/30 mb-1.5 border-l-2 pl-2.5 italic opacity-80 last:mb-0">{children}</blockquote>
    ),
    code: ({ children, className }) => {
        const isBlock = className?.startsWith('language-');
        if (isBlock) {
            return <CodeBlock className={className}>{children}</CodeBlock>;
        }
        return <code className="bg-primary/10 rounded px-1 py-0.5 text-xs">{children}</code>;
    },
    pre: ({ children }) => <>{children}</>,
    table: ({ children }) => (
        <div className="my-1.5 overflow-x-auto rounded-lg border border-sidebar-border/70 bg-sidebar">
            <table className="w-full text-xs text-sidebar-foreground">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="border-b border-sidebar-border/70 bg-sidebar/60">{children}</thead>,
    th: ({ children }) => <th className="px-2.5 py-1 text-left font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-t border-sidebar-border/70 px-2.5 py-1">{children}</td>,
    hr: () => <hr className="border-border my-2" />,
};

const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
        </ReactMarkdown>
    );
});

// ── Tool steps display ────────────────────────────────────────────────

const toolLabels: Record<string, { running: string; done: string }> = {
    NavigateTo: { running: 'Navigating…', done: 'Navigated' },
    SearchProjects: { running: 'Searching projects…', done: 'Searched projects' },
    CreateProject: { running: 'Creating project…', done: 'Created project' },
    ManageProject: { running: 'Managing project…', done: 'Managed project' },
    CreateSchema: { running: 'Creating collection…', done: 'Created collection' },
    ManageSchema: { running: 'Modifying schema…', done: 'Modified schema' },
};

function humanizeToolName(name: string, status: ToolStep['status'], retries?: number): string {
    const labels = toolLabels[name];
    let label: string;
    if (labels) {
        label = status === 'running' ? labels.running : labels.done;
    } else {
        const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        label = status === 'running' ? `Running ${words}…` : `Ran ${words}`;
    }
    if (retries && status === 'running') {
        label = `Retrying… (attempt ${retries + 1})`;
    }
    return label;
}

function ToolStepItem({ step }: { step: ToolStep }) {
    const label = humanizeToolName(step.toolName, step.status, step.retries);

    return (
        <div className="text-muted-foreground mb-1.5 last:mb-0">
            <div className="flex items-center gap-1.5 text-[11px]">
                {step.status === 'running' ? (
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : step.status === 'error' ? (
                    <XCircle className="h-3 w-3 text-destructive shrink-0" />
                ) : (
                    <Check className="h-3 w-3 text-primary shrink-0" />
                )}
                <Wrench className="h-2.5 w-2.5 shrink-0 opacity-50" />
                <span>{label}</span>
            </div>
        </div>
    );
}

function normalizeAssistantParts(message: AiChatMessage): AiChatPart[] {
    if (message.role !== 'assistant') {
        return [];
    }
    const { parts, content } = message;
    if (Array.isArray(parts) && parts.length > 0) {
        return parts;
    }
    if (content?.trim()) {
        return [{ type: 'text', content: content ?? '' }];
    }
    return [];
}

/**
 * Show “Thinking…” while the stream is still open and we’re not actively streaming text
 * or running a tool. Covers: empty bubble, and the gap after a tool finishes until the
 * next text_delta or tool_call (so the reply doesn’t look “done” between tools).
 */
function shouldShowAssistantThinkingPlaceholder(message: AiChatMessage): boolean {
    if (message.role !== 'assistant') {
        return false;
    }
    const parts = normalizeAssistantParts(message);
    const hasRunningTool = parts.some((p) => p.type === 'tool' && p.step.status === 'running');
    if (hasRunningTool) {
        return false;
    }
    if (parts.length === 0) {
        return true;
    }
    const last = parts[parts.length - 1];
    if (last.type === 'tool' && last.step.status !== 'running') {
        return true;
    }
    return false;
}

function flattenAssistantTextFromParts(parts: AiChatPart[]): string {
    return parts
        .filter((p): p is Extract<AiChatPart, { type: 'text' }> => p.type === 'text')
        .map((p) => p.content)
        .join('');
}

// ── Helper: get XSRF token ────────────────────────────────────────────

function getXsrfToken(): string {
    const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
    return token ? decodeURIComponent(token) : '';
}

// ── Main component ─────────────────────────────────────────────────────

function formatTokens(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

export function AiChatPanel() {
    const {
        isOpen, close,
        messages, setMessages,
        conversationId, setConversationId,
        isLoading, setIsLoading,
        startNewChat,
        totalUsage,
    } = useAiChat();
    const isBelowLg = useIsBelowLg();
    const { aiShowTokenUsage } = usePage<SharedData>().props;
    const [input, setInput] = useState('');
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [view, setView] = useState<'chat' | 'history'>('chat');
    const [conversations, setConversations] = useState<AiConversation[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const prevMessageCountRef = useRef(messages.length);
    const hasClosedForMobileRef = useRef(false);

    // AI defaults to open on desktop; keep it closed on smaller screens until opened.
    useEffect(() => {
        if (isBelowLg && !hasClosedForMobileRef.current) {
            hasClosedForMobileRef.current = true;
            close();
        }
    }, [isBelowLg, close]);

    const scrollToBottom = useCallback((instant = false) => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
        });
    }, []);

    // Scroll when messages change — instant on re-mount, smooth on new messages
    useEffect(() => {
        if (messages.length === 0) return;

        const isNewMessage = messages.length !== prevMessageCountRef.current;
        prevMessageCountRef.current = messages.length;

        // On page navigation (re-render without new messages), scroll instantly (no jerk)
        // On new message, scroll smoothly
        scrollToBottom(!isNewMessage);
    }, [messages, scrollToBottom]);

    // Re-focus the input after AI finishes responding
    useEffect(() => {
        if (!isLoading && isOpen) {
            requestAnimationFrame(() => textareaRef.current?.focus());
        }
    }, [isLoading, isOpen]);

    // ── Resize ─────────────────────────────────────────────────────────

    const handleResizeStart = useCallback((e: ReactMouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = width;

        const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
            const delta = startX - moveEvent.clientX;
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [width]);

    // ── Conversation history ───────────────────────────────────────────

    const fetchConversations = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const res = await fetch('/ai/conversations', {
                headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': getXsrfToken() },
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch {
            // Silently fail
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    const openHistory = useCallback(() => {
        setView('history');
        fetchConversations();
    }, [fetchConversations]);

    const loadConversation = useCallback(async (id: string) => {
        setIsLoadingConversation(true);
        try {
            const res = await fetch(`/ai/conversations/${id}`, {
                headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': getXsrfToken() },
            });
            if (res.ok) {
                const data = await res.json();
                setConversationId(id);
                setMessages(data.messages as AiChatMessage[]);
                setView('chat');
            }
        } catch {
            // Silently fail
        } finally {
            setIsLoadingConversation(false);
        }
    }, [setConversationId, setMessages]);

    const deleteConversation = useCallback(async (id: string, e: ReactMouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/ai/conversations/${id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': getXsrfToken() },
            });
            if (res.ok) {
                setConversations((prev) => prev.filter((c) => c.id !== id));
                // If we deleted the active conversation, start fresh
                if (conversationId === id) {
                    startNewChat();
                }
            }
        } catch {
            // Silently fail
        }
    }, [conversationId, startNewChat]);

    const handleNewChat = useCallback(() => {
        startNewChat();
        setView('chat');
    }, [startNewChat]);

    // ── Send message ───────────────────────────────────────────────────

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        setMessages((prev) => [
            ...prev,
            { role: 'user', content: userMessage },
            { role: 'assistant', content: '', parts: [] },
        ]);

        try {
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();

            const response = await fetch('/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                body: JSON.stringify({
                    message: userMessage,
                    conversation_id: conversationId,
                    current_url: window.location.pathname,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                let errorMessage: string;

                if (contentType.includes('application/json')) {
                    const json = await response.json();
                    errorMessage = json.message || json.error || `Request failed (${response.status})`;
                } else {
                    const text = await response.text();
                    const match = text.match(/<title>(.*?)<\/title>/i);
                    errorMessage = match?.[1] || `Request failed (${response.status})`;
                }

                if (response.status === 403) errorMessage = 'AI assistant is disabled. Enable it in App Settings > AI.';
                if (response.status === 401) errorMessage = 'Your session has expired. Please refresh the page.';
                if (response.status === 429) errorMessage = 'Too many requests. Please wait a moment and try again.';
                if (response.status === 422) errorMessage = 'Invalid message. Please try again.';

                throw new Error(errorMessage);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let messageUsage: TokenUsage | undefined;
            let pendingNavigationUrl: string | null = null;
            let pendingReload = false;
            let streamParts: AiChatPart[] = [];

            const updateAssistantMessage = (currentParts: AiChatPart[]) => {
                const textContent = flattenAssistantTextFromParts(currentParts);
                setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.role === 'assistant') {
                        updated[lastIdx] = { ...updated[lastIdx], content: textContent, parts: [...currentParts] };
                    }
                    return updated;
                });
            };

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const sseChunks = buffer.split('\n\n');
                    buffer = sseChunks.pop() || '';

                    for (const sseChunk of sseChunks) {
                        const lines = sseChunk.split('\n');
                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);

                                if (parsed.type === 'conversation_id' && parsed.conversation_id) {
                                    setConversationId(parsed.conversation_id);
                                    continue;
                                }

                                // Capture token usage from stream_end event
                                if (parsed.type === 'stream_end' && parsed.usage) {
                                    messageUsage = parsed.usage as TokenUsage;
                                    continue;
                                }

                                // Handle navigation events from backend
                                if (parsed.type === 'navigate' && parsed.url) {
                                    pendingNavigationUrl = parsed.url;
                                    continue;
                                }

                                // Handle reload events from backend (schema changes)
                                if (parsed.type === 'reload') {
                                    pendingReload = true;
                                    continue;
                                }

                                if (parsed.type === 'tool_call' && parsed.tool_name) {
                                    const next = [...streamParts];
                                    const failedIdx = next.findLastIndex(
                                        (p) =>
                                            p.type === 'tool' &&
                                            p.step.toolName === parsed.tool_name &&
                                            p.step.status === 'error',
                                    );
                                    if (failedIdx !== -1) {
                                        const prevRetries =
                                            next[failedIdx].type === 'tool'
                                                ? (next[failedIdx].step.retries ?? 0)
                                                : 0;
                                        next[failedIdx] = {
                                            type: 'tool',
                                            step: {
                                                toolName: parsed.tool_name,
                                                status: 'running',
                                                arguments: parsed.arguments,
                                                retries: prevRetries + 1,
                                            },
                                        };
                                    } else {
                                        next.push({
                                            type: 'tool',
                                            step: {
                                                toolName: parsed.tool_name,
                                                status: 'running',
                                                arguments: parsed.arguments,
                                            },
                                        });
                                    }
                                    streamParts = next;
                                    updateAssistantMessage(streamParts);
                                    continue;
                                }

                                if (parsed.type === 'tool_result' && parsed.tool_name) {
                                    const next = [...streamParts];
                                    const stepIdx = next.findLastIndex(
                                        (p) =>
                                            p.type === 'tool' &&
                                            p.step.toolName === parsed.tool_name &&
                                            p.step.status === 'running',
                                    );
                                    if (stepIdx !== -1 && next[stepIdx].type === 'tool') {
                                        const resultStr =
                                            typeof parsed.result === 'string' ? parsed.result : JSON.stringify(parsed.result);
                                        let isError = parsed.successful === false || !!parsed.error;
                                        if (!isError && resultStr) {
                                            try {
                                                const resultJson = JSON.parse(resultStr);
                                                if (resultJson.error) isError = true;
                                            } catch {
                                                // not JSON — ignore
                                            }
                                        }
                                        next[stepIdx] = {
                                            type: 'tool',
                                            step: {
                                                ...next[stepIdx].step,
                                                status: isError ? 'error' : 'done',
                                                result: resultStr,
                                                error: parsed.error ?? undefined,
                                            },
                                        };
                                        streamParts = next;
                                        updateAssistantMessage(streamParts);
                                    }
                                    continue;
                                }

                                if (parsed.type === 'text_delta' && parsed.delta) {
                                    const next = [...streamParts];
                                    const last = next[next.length - 1];
                                    if (last?.type === 'text') {
                                        next[next.length - 1] = { type: 'text', content: last.content + parsed.delta };
                                    } else {
                                        next.push({ type: 'text', content: parsed.delta });
                                    }
                                    streamParts = next;
                                    updateAssistantMessage(streamParts);
                                }
                            } catch {
                                if (data) {
                                    const next = [...streamParts];
                                    const last = next[next.length - 1];
                                    if (last?.type === 'text') {
                                        next[next.length - 1] = { type: 'text', content: last.content + data };
                                    } else {
                                        next.push({ type: 'text', content: data });
                                    }
                                    streamParts = next;
                                    updateAssistantMessage(streamParts);
                                }
                            }
                        }
                    }
                }
            }

            // Attach usage to the assistant message after stream completes
            if (messageUsage) {
                setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.role === 'assistant') {
                        updated[lastIdx] = { ...updated[lastIdx], usage: messageUsage };
                    }
                    return updated;
                });
            }

            // Execute pending navigation after stream is fully complete
            if (pendingNavigationUrl) {
                const url = pendingNavigationUrl.startsWith('/') ? pendingNavigationUrl : `/${pendingNavigationUrl}`;
                // Only navigate to internal paths (never external URLs)
                if (url === '/' || /^\/[a-zA-Z0-9]/.test(url)) {
                    setTimeout(() => router.visit(url), 300);
                }
            } else if (pendingReload) {
                // Full page visit to reflect content/schema changes
                setTimeout(() => router.visit(window.location.href, { preserveState: false }), 300);
            }

            const hasAssistantBody =
                streamParts.some(
                    (p) =>
                        (p.type === 'text' && p.content.length > 0) ||
                        (p.type === 'tool' && (p.step.status === 'running' || p.step.status === 'done' || p.step.status === 'error')),
                );
            if (!hasAssistantBody) {
                setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.role === 'assistant' && !updated[lastIdx].content) {
                        updated[lastIdx] = {
                            ...updated[lastIdx],
                            content: 'Sorry, I received an empty response. Please try again.',
                            parts: [{ type: 'text', content: 'Sorry, I received an empty response. Please try again.' }],
                        };
                    }
                    return updated;
                });
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            const errorText = `Error: ${errorMessage}`;
            setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === 'assistant') {
                    updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: errorText,
                        parts: [{ type: 'text', content: errorText }],
                    };
                }
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleTextareaInput = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    };

    // ── Render ─────────────────────────────────────────────────────────

    const panelInner = (
        <div className="border-sidebar-border/50 bg-background flex h-full max-h-svh flex-col overflow-hidden lg:border-l">
            {/* Header */}
            <div className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                        <BotMessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold">Elmapi AI</h2>
                        <p className="text-muted-foreground text-xs">Your CMS assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleNewChat}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1.5 transition-colors"
                        title="New chat"
                    >
                        <MessageSquarePlus className="h-4 w-4" />
                    </button>
                    <button
                        onClick={view === 'history' ? () => setView('chat') : openHistory}
                        className={cn(
                            'rounded-md p-1.5 transition-colors',
                            view === 'history'
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        )}
                        title="Chat history"
                    >
                        <History className="h-4 w-4" />
                    </button>
                    <button
                        onClick={close}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1.5 transition-colors"
                        title="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {view === 'history' ? (
                <div className="flex-1 overflow-y-auto">
                    {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                            <History className="text-muted-foreground h-8 w-8" />
                            <p className="text-muted-foreground text-sm">No conversations yet</p>
                            <p className="text-muted-foreground text-xs">Start chatting to create your first conversation.</p>
                        </div>
                    ) : (
                        <div className="divide-border divide-y">
                            {conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => loadConversation(conv.id)}
                                    disabled={isLoadingConversation}
                                    className={cn(
                                        'hover:bg-accent/50 group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                                        conversationId === conv.id && 'bg-accent/30',
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {conv.title || 'Untitled conversation'}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {formatRelativeFromNow(conv.updated_at)}
                                        </p>
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => deleteConversation(conv.id, e)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') deleteConversation(conv.id, e as unknown as ReactMouseEvent); }}
                                        className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0 cursor-pointer rounded p-1 opacity-0 transition-all group-hover:opacity-100"
                                        title="Delete conversation"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
                                    <BotMessageSquare className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">How can I help you?</p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Ask me to create projects, collections, fields, manage entries, search projects, and more.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {messages.map((message, index) => (
                                    <div key={index}>
                                        {message.role === 'user' ? (
                                            <div className="flex justify-end">
                                                <div className="bg-muted max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed">
                                                    {message.content}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2.5">
                                                <div className="border-border bg-background mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                                                    <BotMessageSquare className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-2 text-[13px] leading-relaxed">
                                                    {normalizeAssistantParts(message).map((part, pi) =>
                                                        part.type === 'text' ? (
                                                            <MarkdownMessage key={pi} content={part.content} />
                                                        ) : (
                                                            <ToolStepItem key={pi} step={part.step} />
                                                        ),
                                                    )}
                                                    {(() => {
                                                        if (
                                                            !isLoading ||
                                                            index !== messages.length - 1 ||
                                                            message.role !== 'assistant' ||
                                                            !shouldShowAssistantThinkingPlaceholder(message)
                                                        ) {
                                                            return null;
                                                        }
                                                        return (
                                                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                Thinking...
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {aiShowTokenUsage && (totalUsage.prompt_tokens > 0 || totalUsage.completion_tokens > 0) && (
                        <div className="border-sidebar-border/50 text-muted-foreground flex items-center justify-center gap-3 border-t px-4 py-1.5 text-[11px]">
                            <span>Tokens: ↑{formatTokens(totalUsage.prompt_tokens)} in · ↓{formatTokens(totalUsage.completion_tokens)} out · {formatTokens(totalUsage.prompt_tokens + totalUsage.completion_tokens)} total</span>
                        </div>
                    )}

                    <div className="p-3">
                        <form onSubmit={handleSubmit}>
                            <div className="flex items-end rounded-md border border-sidebar-border/70 bg-sidebar focus-within:ring-2 focus-within:ring-sidebar-ring/30">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onInput={handleTextareaInput}
                                    placeholder="Ask Elmapi AI..."
                                    rows={1}
                                    disabled={isLoading}
                                    className="max-h-[120px] flex-1 resize-none bg-transparent px-4 py-3 text-[13px] text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/70 disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="mb-1.5 mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:cursor-not-allowed disabled:text-sidebar-foreground/40"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <>
            {!isBelowLg && (
                <div
                    style={{ width: isOpen ? width : 0 }}
                    className={cn(
                        'relative max-h-svh shrink-0 overflow-hidden',
                        !isResizing && 'transition-[width] duration-300 ease-in-out',
                    )}
                >
                    <div
                        onMouseDown={handleResizeStart}
                        className={cn(
                            'absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize transition-colors',
                            'hover:bg-primary/20',
                            isResizing && 'bg-primary/30',
                        )}
                    />
                    <div className="h-full" style={{ width }}>
                        {panelInner}
                    </div>
                </div>
            )}

            {isBelowLg && (
                <Sheet
                    open={isOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            close();
                        }
                    }}
                >
                    <SheetContent side="right" className="w-full p-0 sm:max-w-md [&>button]:hidden">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Elmapi AI</SheetTitle>
                            <SheetDescription>Your CMS assistant</SheetDescription>
                        </SheetHeader>
                        {panelInner}
                    </SheetContent>
                </Sheet>
            )}
        </>
    );
}
