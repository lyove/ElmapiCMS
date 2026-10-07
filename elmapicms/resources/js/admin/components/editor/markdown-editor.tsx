import { Prec, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { usePage } from '@inertiajs/react';
import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    codeBlockPlugin,
    codeMirrorPlugin,
    CreateLink,
    diffSourcePlugin,
    DiffSourceToggleWrapper,
    headingsPlugin,
    imagePlugin,
    InsertCodeBlock,
    InsertTable,
    InsertThematicBreak,
    linkDialogPlugin,
    linkPlugin,
    listsPlugin,
    ListsToggle,
    markdownShortcutPlugin,
    MDXEditor,
    quotePlugin,
    Separator,
    tablePlugin,
    thematicBreakPlugin,
    Button as ToolbarButton,
    toolbarPlugin,
    UndoRedo,
    type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { ImagePlus } from 'lucide-react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { MediaLibraryModal } from '@/pages/admin/Assets/MediaFieldSelectModal';
import type { Asset, Project } from '@/admin/types';
import '../../../../css/mdx-editor-overrides.css';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

interface ToolbarAssetButtonProps {
    onOpen: () => void;
}

function ToolbarAssetButton({ onOpen }: ToolbarAssetButtonProps) {
    return (
        <ToolbarButton title="Insert from Asset Library" type="button" onClick={onOpen} className="flex items-center gap-1">
            <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
    );
}

function escapeMarkdownText(text: string): string {
    return text.replace(/[[\]\\()]/g, '\\$&');
}

function subscribeDocumentDarkClass(callback: () => void): () => void {
    const root = document.documentElement;
    const observer = new MutationObserver(callback);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
}

function getDocumentIsDark(): boolean {
    return document.documentElement.classList.contains('dark');
}

function useDocumentIsDark(): boolean {
    return useSyncExternalStore(subscribeDocumentDarkClass, getDocumentIsDark, () => false);
}

/** Languages for fenced blocks; must be non-empty — see @mdxeditor/editor codeMirrorPlugin init. */
const CODE_BLOCK_LANGUAGES: Record<string, string> = {
    '': 'Plain text',
    plaintext: 'Plain text',
    js: 'JavaScript',
    ts: 'TypeScript',
    tsx: 'TypeScript (React)',
    jsx: 'JavaScript (React)',
    css: 'CSS',
    php: 'PHP',
    json: 'JSON',
    html: 'HTML',
    md: 'Markdown',
    bash: 'Bash',
    sh: 'Shell',
    sql: 'SQL',
    yaml: 'YAML',
    xml: 'XML',
    py: 'Python',
    rs: 'Rust',
    go: 'Go',
};

export function MarkdownEditor({ value, onChange, placeholder, disabled }: MarkdownEditorProps) {
    const editorRef = useRef<MDXEditorMethods | null>(null);
    /** Last markdown we know came from the editor's onChange — skips setMarkdown when in sync (keeps cursor). */
    const lastMarkdownAckFromEditorRef = useRef(value);
    const [isAssetModalOpen, setAssetModalOpen] = useState(false);
    const isDark = useDocumentIsDark();

    const normalizedValue = value || '';

    const handleEditorMarkdownChange = useCallback(
        (nextMarkdown: string) => {
            lastMarkdownAckFromEditorRef.current = nextMarkdown;
            onChange(nextMarkdown);
        },
        [onChange],
    );

    /*
      MDXEditor only applies the `markdown` prop on first mount. Updates from outside (e.g. AI field
      button streaming into form state) must call setMarkdown. We avoid calling it when the prop matches
      what the editor last reported so typing does not reset selection.
    */
    useLayoutEffect(() => {
        if (normalizedValue === lastMarkdownAckFromEditorRef.current) {
            return;
        }
        editorRef.current?.setMarkdown(normalizedValue);
        lastMarkdownAckFromEditorRef.current = normalizedValue;
    }, [normalizedValue]);

    interface PageProps extends InertiaPageProps {
        project?: Project;
    }
    const { project } = usePage<PageProps>().props;

    const codeMirrorThemingExtensions = useMemo((): Extension[] => {
        if (!isDark) {
            return [];
        }

        return [Prec.highest(oneDark) as Extension];
    }, [isDark]);

    const plugins = useMemo(
        () => [
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin(),
            tablePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
            codeMirrorPlugin({
                codeBlockLanguages: CODE_BLOCK_LANGUAGES,
                codeMirrorExtensions: codeMirrorThemingExtensions,
            }),
            diffSourcePlugin({
                viewMode: 'rich-text',
                codeMirrorExtensions: codeMirrorThemingExtensions,
            }),
            toolbarPlugin({
                toolbarContents: () => (
                    <DiffSourceToggleWrapper options={['rich-text', 'source']}>
                        <UndoRedo />
                        <Separator />
                        <BlockTypeSelect />
                        <Separator />
                        <BoldItalicUnderlineToggles />
                        <CreateLink />
                        <ListsToggle />
                        <Separator />
                        <InsertTable />
                        <InsertThematicBreak />
                        <InsertCodeBlock />
                        <Separator />
                        <ToolbarAssetButton onOpen={() => setAssetModalOpen(true)} />
                    </DiffSourceToggleWrapper>
                ),
            }),
        ],
        [codeMirrorThemingExtensions],
    );

    const handleSelectAssets = (assets: Asset[]): void => {
        const selected = assets[0];
        if (!selected) {
            return;
        }

        const src = selected.full_url || selected.url;
        const altText = selected.metadata?.alt_text || selected.original_filename || 'image';
        const markdown = `\n![${escapeMarkdownText(altText)}](${escapeMarkdownText(src)})\n`;

        editorRef.current?.focus(() => {
            editorRef.current?.insertMarkdown(markdown);
        });

        setAssetModalOpen(false);
    };

    return (
        <div className="markdown-mdx-editor border-input bg-background h-fit min-w-0 max-w-full overflow-visible rounded-md border">
            {/*
              Inner scroll for sticky toolbar. MDX popovers (link dialog, selects) use document.body —
              custom overlayContainer nested under this tree breaks position:fixed anchors vs viewport coords.
            */}
            <div className="markdown-mdx-editor-scroll max-h-[min(65vh,calc(100svh-11rem))] min-h-0 overflow-y-auto overscroll-contain rounded-md">
                <MDXEditor
                    key={isDark ? 'mdx-dark' : 'mdx-light'}
                    ref={editorRef}
                    markdown={normalizedValue}
                    onChange={handleEditorMarkdownChange}
                    placeholder={placeholder}
                    readOnly={disabled}
                    className="bg-background text-foreground"
                    contentEditableClassName="max-w-none px-4 py-3 text-base leading-relaxed"
                    plugins={plugins}
                />
            </div>

            {project ? (
                <MediaLibraryModal
                    isOpen={isAssetModalOpen}
                    onClose={() => setAssetModalOpen(false)}
                    project={project}
                    onSelect={handleSelectAssets}
                    currentlySelected={[]}
                    allowMultiple={false}
                />
            ) : null}
        </div>
    );
}
