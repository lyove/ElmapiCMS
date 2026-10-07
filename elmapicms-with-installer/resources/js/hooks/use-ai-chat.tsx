import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    cache_write_input_tokens?: number;
    cache_read_input_tokens?: number;
    reasoning_tokens?: number;
}

export interface ToolStep {
    toolName: string;
    status: 'running' | 'done' | 'error';
    arguments?: Record<string, unknown>;
    result?: string;
    error?: string;
    retries?: number;
}

/** Ordered segments for assistant messages: text and tool calls interleave as they occur. */
export type AiChatPart =
    | { type: 'text'; content: string }
    | { type: 'tool'; step: ToolStep };

export interface AiChatMessage {
    role: 'user' | 'assistant';
    content: string;
    usage?: TokenUsage;
    parts?: AiChatPart[];
}

export interface AiConversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface AiChatContextType {
    isOpen: boolean;
    toggle: () => void;
    open: () => void;
    close: () => void;
    messages: AiChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<AiChatMessage[]>>;
    conversationId: string | null;
    setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    startNewChat: () => void;
    totalUsage: TokenUsage;
}

const AiChatContext = createContext<AiChatContextType | undefined>(undefined);

export function AiChatProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);
    const [messages, setMessages] = useState<AiChatMessage[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    const startNewChat = useCallback(() => {
        setMessages([]);
        setConversationId(null);
    }, []);

    const totalUsage = useMemo<TokenUsage>(() => {
        return messages.reduce<TokenUsage>(
            (acc, msg) => {
                if (msg.usage) {
                    acc.prompt_tokens += msg.usage.prompt_tokens;
                    acc.completion_tokens += msg.usage.completion_tokens;
                }
                return acc;
            },
            { prompt_tokens: 0, completion_tokens: 0 },
        );
    }, [messages]);

    return (
        <AiChatContext.Provider
            value={{
                isOpen, toggle, open, close,
                messages, setMessages,
                conversationId, setConversationId,
                isLoading, setIsLoading,
                startNewChat,
                totalUsage,
            }}
        >
            {children}
        </AiChatContext.Provider>
    );
}

export function useAiChat() {
    const context = useContext(AiChatContext);
    if (!context) {
        throw new Error('useAiChat must be used within an AiChatProvider');
    }
    return context;
}
