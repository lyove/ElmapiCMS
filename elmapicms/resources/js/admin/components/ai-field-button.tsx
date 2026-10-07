import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2, Languages, Wand2, CheckCheck, Expand, Shrink, PenLine, Undo2, Palette } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/admin/components/ui/dropdown-menu';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { streamContentAi, ContentAiContext, ContentAiAction } from '@/admin/hooks/use-content-ai';
import { useContentAiUsage } from '@/admin/contexts/content-ai-usage-context';
import { useContentAiForm } from '@/admin/contexts/content-ai-form-context';

interface AiFieldButtonProps {
    value: string;
    onChange: (newValue: string) => void;
    context?: ContentAiContext;
    locales?: string[];
    disabled?: boolean;
}

const TONES = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'formal', label: 'Formal' },
    { value: 'concise', label: 'Concise' },
];

export default function AiFieldButton({ value, onChange, context, locales = [], disabled }: AiFieldButtonProps) {
    const [isStreaming, setIsStreaming] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showPromptInput, setShowPromptInput] = useState<'generate' | 'rewrite' | null>(null);
    const [promptValue, setPromptValue] = useState('');
    const [previousValue, setPreviousValue] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const promptInputRef = useRef<HTMLInputElement | null>(null);
    const promptContainerRef = useRef<HTMLDivElement | null>(null);
    const { reportUsage } = useContentAiUsage();
    const { getFieldsSummary } = useContentAiForm();

    // Focus the prompt input when it appears
    useEffect(() => {
        if (showPromptInput) {
            const id = setTimeout(() => promptInputRef.current?.focus(), 150);
            return () => clearTimeout(id);
        }
    }, [showPromptInput]);

    // Click outside to close the prompt
    useEffect(() => {
        if (!showPromptInput) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (promptContainerRef.current && !promptContainerRef.current.contains(e.target as Node)) {
                setShowPromptInput(null);
                setPromptValue('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPromptInput]);

    const buildContextWithOtherFields = useCallback((): ContentAiContext | undefined => {
        const fields = getFieldsSummary();
        // Exclude the current field and build a summary string
        const otherFields = fields
            .filter(f => f.name !== context?.field_name)
            .map(f => `${f.label}: ${typeof f.value === 'string' ? f.value : JSON.stringify(f.value)}`)
            .join('\n');

        return {
            ...context,
            other_fields: otherFields || undefined,
        };
    }, [context, getFieldsSummary]);

    const runAction = useCallback((action: ContentAiAction, extra?: { tone?: string; target_locale?: string; prompt?: string; custom_instruction?: string }) => {
        if (isStreaming) return;

        // Save the current value for undo
        setPreviousValue(value);
        setIsStreaming(true);

        abortControllerRef.current?.abort();
        const ac = new AbortController();
        abortControllerRef.current = ac;

        let result = '';

        streamContentAi({
            action,
            text: value || '',
            prompt: extra?.prompt,
            tone: extra?.tone,
            target_locale: extra?.target_locale,
            custom_instruction: extra?.custom_instruction,
            context: buildContextWithOtherFields(),
            signal: ac.signal,
            onDelta: (text) => {
                result += text;
                onChange(result);
            },
            onDone: (info) => {
                setIsStreaming(false);
                reportUsage(info);
            },
            onError: (error) => {
                setIsStreaming(false);
                toast.error(error || 'AI action failed');
            },
        });
    }, [value, onChange, context, isStreaming, buildContextWithOtherFields]);

    const handlePromptSubmit = () => {
        if (!promptValue.trim()) return;
        const mode = showPromptInput;
        setShowPromptInput(null);
        if (mode === 'generate') {
            runAction('generate', { prompt: promptValue.trim() });
        } else if (mode === 'rewrite') {
            runAction('rewrite', { custom_instruction: promptValue.trim() });
        }
        setPromptValue('');
    };

    const handleUndo = () => {
        if (previousValue !== null) {
            onChange(previousValue);
            setPreviousValue(null);
        }
    };

    if (isStreaming) {
        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground"
                onClick={() => {
                    abortControllerRef.current?.abort();
                    setIsStreaming(false);
                }}
                title="Cancel AI action"
            >
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                <span className="text-[10px]">Stop</span>
            </Button>
        );
    }

    return (
        <div className="relative flex items-center gap-0.5">
            {previousValue !== null && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-muted-foreground hover:text-orange-500"
                    onClick={handleUndo}
                    title="Undo AI change"
                >
                    <Undo2 className="h-3 w-3" />
                </Button>
            )}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-muted-foreground hover:text-primary"
                        disabled={disabled}
                        title="AI actions"
                    >
                        <Sparkles className="h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-48"
                    onCloseAutoFocus={(e) => {
                        if (showPromptInput) {
                            e.preventDefault();
                        }
                    }}
                >
                    {/* Tone-based rewrite submenu */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger disabled={!value} className="gap-4 [&_svg:not([class*='text-'])]:text-muted-foreground">
                            <Wand2 className="h-3.5 w-3.5 shrink-0" />
                            Improve
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {TONES.map(t => (
                                <DropdownMenuItem key={t.value} onClick={() => runAction('rewrite', { tone: t.value })}>
                                    {t.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => runAction('fix_grammar')} disabled={!value}>
                        <CheckCheck className="h-3.5 w-3.5 mr-2" />
                        Fix Grammar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAction('expand')} disabled={!value}>
                        <Expand className="h-3.5 w-3.5 mr-2" />
                        Expand
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAction('summarize')} disabled={!value}>
                        <Shrink className="h-3.5 w-3.5 mr-2" />
                        Summarize
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => {
                        e.preventDefault();
                        setDropdownOpen(false);
                        setShowPromptInput('rewrite');
                    }} disabled={!value}>
                        <Palette className="h-3.5 w-3.5 mr-2" />
                        Rewrite as...
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => {
                        e.preventDefault();
                        setDropdownOpen(false);
                        setShowPromptInput('generate');
                    }}>
                        <PenLine className="h-3.5 w-3.5 mr-2" />
                        Generate...
                    </DropdownMenuItem>
                    {locales.length > 1 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger disabled={!value} className="gap-4 [&_svg:not([class*='text-'])]:text-muted-foreground">
                                    <Languages className="h-3.5 w-3.5 shrink-0" />
                                    Translate
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    {locales.map((loc) => (
                                        <DropdownMenuItem key={loc} onClick={() => runAction('translate', { target_locale: loc })}>
                                            <span className="uppercase text-xs font-medium w-6">{loc}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Prompt input for Generate / Rewrite as... */}
            {showPromptInput && (
                <div ref={promptContainerRef} className="absolute right-0 top-full mt-1 z-50 w-72 rounded-md border bg-popover p-2 shadow-md">
                    <div className="flex gap-1.5">
                        <Input
                            ref={promptInputRef}
                            value={promptValue}
                            onChange={(e) => setPromptValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePromptSubmit();
                                if (e.key === 'Escape') { setShowPromptInput(null); setPromptValue(''); }
                            }}
                            placeholder={showPromptInput === 'generate' ? 'Write about...' : 'e.g. more persuasive, for developers...'}
                            className="h-8 text-sm"
                        />
                        <Button type="button" size="sm" className="h-8 px-3" onClick={handlePromptSubmit} disabled={!promptValue.trim()}>
                            Go
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
