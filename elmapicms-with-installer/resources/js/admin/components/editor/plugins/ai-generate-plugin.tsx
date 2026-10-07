import { useState, useRef, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, $createTextNode, $createParagraphNode, $getRoot } from 'lexical'
import { $generateNodesFromDOM } from '@lexical/html'
import { toast } from 'sonner'
import { Sparkles, Loader2, X } from 'lucide-react'
import { Button } from '@/admin/components/ui/button'
import { Input } from '@/admin/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/admin/components/ui/popover'
import { streamContentAi } from '@/admin/hooks/use-content-ai'
import { useContentAiUsage } from '@/admin/contexts/content-ai-usage-context'
import { useContentAiForm } from '@/admin/contexts/content-ai-form-context'

export function AiGeneratePlugin({ aiEnabled }: { aiEnabled?: boolean }) {
    const [editor] = useLexicalComposerContext()
    const [open, setOpen] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const { reportUsage } = useContentAiUsage()
    const { getFieldsSummary, collectionName } = useContentAiForm()

    const buildContext = useCallback(() => {
        const fields = getFieldsSummary()
        const otherFields = fields
            .map(f => `${f.label}: ${typeof f.value === 'string' ? f.value : JSON.stringify(f.value)}`)
            .join('\n')
        return {
            collection_name: collectionName || undefined,
            other_fields: otherFields || undefined,
        }
    }, [getFieldsSummary, collectionName])

    const handleGenerate = useCallback(() => {
        if (!prompt.trim() || isStreaming) return

        setIsStreaming(true)
        setOpen(false)

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        let result = ''

        streamContentAi({
            action: 'generate',
            prompt: prompt.trim(),
            context: buildContext(),
            signal: ac.signal,
            onDelta: (text) => {
                result += text
            },
            onDone: (info) => {
                reportUsage(info)
                // Insert the generated text at the current cursor position
                editor.update(() => {
                    const selection = $getSelection()
                    if ($isRangeSelection(selection)) {
                        // Try to parse as HTML and insert rich nodes
                        try {
                            const parser = new DOMParser()
                            const dom = parser.parseFromString(result, 'text/html')
                            const hasRichContent = dom.body.querySelector('p, h1, h2, h3, ul, ol, blockquote, pre, table')
                            
                            if (hasRichContent) {
                                const nodes = $generateNodesFromDOM(editor, dom)
                                selection.insertNodes(nodes)
                            } else {
                                // Plain text — just insert
                                selection.insertRawText(result)
                            }
                        } catch {
                            selection.insertRawText(result)
                        }
                    } else {
                        // No selection, append to end
                        const root = $getRoot()
                        const paragraph = $createParagraphNode()
                        paragraph.append($createTextNode(result))
                        root.append(paragraph)
                    }
                })
                setIsStreaming(false)
                setPrompt('')
            },
            onError: (error) => {
                toast.error(error || 'AI generation failed')
                setIsStreaming(false)
            },
        })
    }, [editor, prompt, isStreaming])

    if (!aiEnabled) return null

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {isStreaming ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                        onClick={(e) => {
                            e.preventDefault()
                            abortRef.current?.abort()
                            setIsStreaming(false)
                        }}
                        title="Cancel generation"
                    >
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        <span className="text-xs">Stop</span>
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-primary"
                        title="AI Generate"
                    >
                        <Sparkles className="h-4 w-4" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-2"
                align="start"
                onOpenAutoFocus={(e) => {
                    e.preventDefault()
                    setTimeout(() => inputRef.current?.focus(), 0)
                }}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex gap-1.5">
                    <Input
                        ref={inputRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate() }}
                        placeholder="Write about..."
                        className="h-8 text-sm"
                    />
                    <Button
                        type="button"
                        size="sm"
                        className="h-8 px-3"
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isStreaming}
                    >
                        Go
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
                    Describe what to write. Text will be inserted at cursor position.
                </p>
            </PopoverContent>
        </Popover>
    )
}
