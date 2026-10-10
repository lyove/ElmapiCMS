import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ContentAiDoneInfo } from '@/hooks/use-content-ai';

interface AiUsageEntry {
    action: string;
    promptTokens: number;
    completionTokens: number;
    timestamp: number;
}

interface ContentAiUsageContextValue {
    /** All usage entries for this session */
    entries: AiUsageEntry[];
    /** Total prompt tokens */
    totalPromptTokens: number;
    /** Total completion tokens */
    totalCompletionTokens: number;
    /** Total tokens (prompt + completion) */
    totalTokens: number;
    /** Number of AI requests made */
    requestCount: number;
    /** Report usage from a completed AI action */
    reportUsage: (info?: ContentAiDoneInfo) => void;
    /** Reset all usage stats */
    resetUsage: () => void;
}

const ContentAiUsageContext = createContext<ContentAiUsageContextValue>({
    entries: [],
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    requestCount: 0,
    reportUsage: () => {},
    resetUsage: () => {},
});

export function ContentAiUsageProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<AiUsageEntry[]>([]);

    const reportUsage = useCallback((info?: ContentAiDoneInfo) => {
        const entry: AiUsageEntry = {
            action: info?.action || 'unknown',
            promptTokens: info?.usage?.prompt_tokens || 0,
            completionTokens: info?.usage?.completion_tokens || 0,
            timestamp: Date.now(),
        };
        setEntries(prev => [...prev, entry]);
    }, []);

    const resetUsage = useCallback(() => {
        setEntries([]);
    }, []);

    const totalPromptTokens = entries.reduce((sum, e) => sum + e.promptTokens, 0);
    const totalCompletionTokens = entries.reduce((sum, e) => sum + e.completionTokens, 0);

    return (
        <ContentAiUsageContext.Provider
            value={{
                entries,
                totalPromptTokens,
                totalCompletionTokens,
                totalTokens: totalPromptTokens + totalCompletionTokens,
                requestCount: entries.length,
                reportUsage,
                resetUsage,
            }}
        >
            {children}
        </ContentAiUsageContext.Provider>
    );
}

export function useContentAiUsage() {
    return useContext(ContentAiUsageContext);
}
