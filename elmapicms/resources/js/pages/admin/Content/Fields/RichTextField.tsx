import FieldBase, { FieldProps } from './FieldBase';
import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

import { Editor } from '@/components/editor/editor';
import { MarkdownEditor } from '@/components/editor/markdown-editor';

type RichTextValue = {
    json?: Record<string, unknown> | null;
    html?: string;
};

function isMarkdownEditor(field: FieldProps['field']): boolean {
    return field.options?.editor?.mode === 'markdown';
}

export default function RichTextField({ field, value, onChange, processing, errors, locales, collectionName }: FieldProps) {
    const markdownMode = isMarkdownEditor(field);

    if (markdownMode) {
        return (
            <MarkdownRichTextField
                field={field}
                value={value}
                onChange={onChange}
                processing={processing}
                errors={errors}
                locales={locales}
                collectionName={collectionName}
            />
        );
    }

    return (
        <LexicalRichTextField
            field={field}
            value={value}
            onChange={onChange}
            processing={processing}
            errors={errors}
            locales={locales}
            collectionName={collectionName}
        />
    );
}

function MarkdownRichTextField({ field, value, onChange, processing, errors, locales, collectionName }: FieldProps) {
    const markdownValue = useMemo(() => {
        if (typeof value === 'string') {
            return value;
        }
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object' && value !== null && 'html' in value) {
            return String((value as RichTextValue).html ?? '');
        }

        return String(value);
    }, [value]);

    const handleMarkdownChange = useCallback((markdown: string) => {
        onChange(field, markdown);
    }, [field, onChange]);

    return (
        <FieldBase field={field} value={value} onChange={onChange} processing={processing} errors={errors} locales={locales} collectionName={collectionName}>
            <MarkdownEditor
                value={markdownValue}
                onChange={handleMarkdownChange}
                placeholder="Write in markdown..."
                disabled={processing}
            />
        </FieldBase>
    );
}

function LexicalRichTextField({ field, value, onChange, processing, errors, locales, collectionName }: FieldProps) {
    const [jsonContent, setJsonContent] = useState<string | undefined>(undefined);
    const [htmlContent, setHtmlContent] = useState<string | undefined>(undefined);
    const htmlRef = useRef<string | undefined>(undefined);
    const jsonRef = useRef<Record<string, unknown> | null>(null);

    useEffect(() => {
        // Initialize from either {json, html}, raw JSON string, or raw HTML string
        if (value && typeof value === 'object' && 'json' in value) {
            const richValue = value as RichTextValue;
            try {
                const jsonValue = richValue.json ?? null;
                setJsonContent(jsonValue ? JSON.stringify(jsonValue) : undefined);
                jsonRef.current = jsonValue;
            } catch {
                setJsonContent(undefined);
                jsonRef.current = null;
            }
            const initialHtml = richValue.html;
            setHtmlContent(initialHtml);
            htmlRef.current = initialHtml;
            return;
        }
        if (typeof value === 'string' && value.trim() !== '') {
            const trimmed = value.trim();
            const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
            if (looksLikeJson) {
                setJsonContent(value);
                htmlRef.current = undefined;
                jsonRef.current = (() => { try { return JSON.parse(value); } catch { return null; } })();
                setHtmlContent(undefined);
            } else {
                setJsonContent(undefined);
                jsonRef.current = null;
                setHtmlContent(value);
                htmlRef.current = value;
            }
        } else {
            setJsonContent(undefined);
            setHtmlContent(undefined);
            htmlRef.current = undefined;
            jsonRef.current = null;
        }
    }, [value]);

    const emitCombinedChange = useCallback(() => {
        onChange(field, { json: jsonRef.current, html: htmlRef.current });
    }, [field, onChange]);

    const handleJsonChange = useCallback((json: string) => {
        let parsed: Record<string, unknown> | null = null;
        try {
            const parsedJson = JSON.parse(json);
            parsed = parsedJson && typeof parsedJson === 'object'
                ? (parsedJson as Record<string, unknown>)
                : null;
        } catch {
            parsed = null;
        }
        jsonRef.current = parsed;
        emitCombinedChange();
    }, [emitCombinedChange]);

    const handleHtmlChange = useCallback((html: string) => {
        setHtmlContent(html);
        htmlRef.current = html;
        emitCombinedChange();
    }, [emitCombinedChange]);

    const { aiEnabled } = usePage<SharedData>().props;

    return (
        <FieldBase field={field} value={value} onChange={onChange} processing={processing} errors={errors} locales={locales} collectionName={collectionName}>
            <div className="rounded-md border border-input">
                <Editor
                    key={`editor-${field.id}`}
                    jsonContent={jsonContent}
                    htmlContent={htmlContent}
                    onJsonChange={handleJsonChange}
                    onHtmlChange={handleHtmlChange}
                    aiEnabled={aiEnabled}
                    locales={locales}
                />
            </div>
        </FieldBase>
    );
}
