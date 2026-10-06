import { createContext, useContext, type ReactNode } from 'react';

/**
 * Context to share form field data with AI components.
 * This allows AI to use other field values as context (e.g. title when generating body).
 */

export interface FieldSummary {
    name: string;
    label: string;
    type: string;
    value: unknown;
}

interface ContentAiFormContextValue {
    /** Get a summary of all form fields and their current values */
    getFieldsSummary: () => FieldSummary[];
    /** Get the collection name */
    collectionName: string;
}

const ContentAiFormContext = createContext<ContentAiFormContextValue>({
    getFieldsSummary: () => [],
    collectionName: '',
});

export function ContentAiFormProvider({
    children,
    getFieldsSummary,
    collectionName,
}: {
    children: ReactNode;
    getFieldsSummary: () => FieldSummary[];
    collectionName: string;
}) {
    return (
        <ContentAiFormContext.Provider value={{ getFieldsSummary, collectionName }}>
            {children}
        </ContentAiFormContext.Provider>
    );
}

export function useContentAiForm() {
    return useContext(ContentAiFormContext);
}
