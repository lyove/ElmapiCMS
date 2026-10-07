import { Dispatch, JSX, useCallback, useEffect, useRef, useState } from "react"
import * as React from "react"
import { toast } from "sonner"
import { $isCodeHighlightNode } from "@lexical/code"
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { mergeRegister } from "@lexical/utils"
import { $generateNodesFromDOM } from "@lexical/html"
import {
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from "lexical"
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  UnderlineIcon,
  Sparkles,
  Wand2,
  CheckCheck,
  Expand,
  Shrink,
  Loader2,
  Languages,
  Palette,
} from "lucide-react"
import { createPortal } from "react-dom"

import { useFloatingLinkContext } from "@/admin/components/editor/context/floating-link-context"
import { getDOMRangeRect } from "@/admin/components/editor/utils/get-dom-range-rect"
import { getSelectedNode } from "@/admin/components/editor/utils/get-selected-node"
import { setFloatingElemPosition } from "@/admin/components/editor/utils/set-floating-elem-position"
import { Separator } from "@/admin/components/ui/separator"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/admin/components/ui/toggle-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/admin/components/ui/dropdown-menu"
import { streamContentAi, type ContentAiAction } from "@/admin/hooks/use-content-ai"
import { useContentAiUsage } from "@/admin/contexts/content-ai-usage-context"
import { useContentAiForm } from "@/admin/contexts/content-ai-form-context"

function FloatingTextFormat({
  editor,
  anchorElem,
  isLink,
  isBold,
  isItalic,
  isUnderline,
  isCode,
  isStrikethrough,
  isSubscript,
  isSuperscript,
  setIsLinkEditMode,
  aiEnabled,
  locales,
}: {
  editor: LexicalEditor
  anchorElem: HTMLElement
  isBold: boolean
  isCode: boolean
  isItalic: boolean
  isLink: boolean
  isStrikethrough: boolean
  isSubscript: boolean
  isSuperscript: boolean
  isUnderline: boolean
  setIsLinkEditMode: Dispatch<boolean>
  aiEnabled?: boolean
  locales?: string[]
}): JSX.Element {
  const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null)
  const [aiStreaming, setAiStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { reportUsage } = useContentAiUsage()
  const { getFieldsSummary, collectionName } = useContentAiForm()

  const buildContext = useCallback((contentFormat?: "plain" | "html") => {
    const fields = getFieldsSummary()
    const otherFields = fields
      .map(f => `${f.label}: ${typeof f.value === 'string' ? f.value : JSON.stringify(f.value)}`)
      .join('\n')
    return {
      collection_name: collectionName || undefined,
      other_fields: otherFields || undefined,
      content_format: contentFormat,
    }
  }, [getFieldsSummary, collectionName])

  const runAiAction = useCallback((action: ContentAiAction, extra?: { target_locale?: string; tone?: string; custom_instruction?: string }) => {
    if (aiStreaming) return

    // Get the selected text
    let selectedText = ''
    let selectedHtml = ''
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selectedText = selection.getTextContent()
      }
    })

    if (action === 'translate') {
      const nativeSelection = window.getSelection()
      const nativeRange = nativeSelection && nativeSelection.rangeCount > 0 ? nativeSelection.getRangeAt(0) : null

      if (nativeRange && !nativeRange.collapsed) {
        const container = document.createElement('div')
        container.appendChild(nativeRange.cloneContents())
        selectedHtml = container.innerHTML.trim()
      }
    }

    if (!selectedText) return

    setAiStreaming(true)
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    let result = ''

    streamContentAi({
      action,
      text: action === 'translate' && selectedHtml ? selectedHtml : selectedText,
      target_locale: extra?.target_locale,
      tone: extra?.tone,
      custom_instruction: extra?.custom_instruction,
      context: buildContext(action === 'translate' && selectedHtml ? 'html' : 'plain'),
      signal: ac.signal,
      onDelta: (text) => {
        result += text
      },
      onDone: (info) => {
        // Replace the selection with the AI result
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            if (action === 'translate' && selectedHtml) {
              try {
                const parser = new DOMParser()
                const dom = parser.parseFromString(result, 'text/html')
                const nodes = $generateNodesFromDOM(editor, dom)
                selection.insertNodes(nodes)
              } catch {
                selection.insertRawText(result)
              }
            } else {
              selection.insertRawText(result)
            }
          }
        })
        setAiStreaming(false)
        reportUsage(info)
      },
      onError: (error) => {
        toast.error(error || 'AI action failed')
        setAiStreaming(false)
      },
    })
  }, [editor, aiStreaming, buildContext])

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true)
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://")
    } else {
      setIsLinkEditMode(false)
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    }
  }, [editor, isLink, setIsLinkEditMode])

  function mouseMoveListener(e: MouseEvent) {
    if (
      popupCharStylesEditorRef?.current &&
      (e.buttons === 1 || e.buttons === 3)
    ) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== "none") {
        const x = e.clientX
        const y = e.clientY
        const elementUnderMouse = document.elementFromPoint(x, y)

        if (!popupCharStylesEditorRef.current.contains(elementUnderMouse)) {
          // Mouse is not over the target element => not a normal click, but probably a drag
          popupCharStylesEditorRef.current.style.pointerEvents = "none"
        }
      }
    }
  }
  function mouseUpListener(e: MouseEvent) {
    if (popupCharStylesEditorRef?.current) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== "auto") {
        popupCharStylesEditorRef.current.style.pointerEvents = "auto"
      }
    }
  }

  useEffect(() => {
    if (popupCharStylesEditorRef?.current) {
      document.addEventListener("mousemove", mouseMoveListener)
      document.addEventListener("mouseup", mouseUpListener)

      return () => {
        document.removeEventListener("mousemove", mouseMoveListener)
        document.removeEventListener("mouseup", mouseUpListener)
      }
    }
  }, [popupCharStylesEditorRef])

  const $updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection()

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current
    const nativeSelection = window.getSelection()

    if (popupCharStylesEditorElem === null) {
      return
    }

    const rootElement = editor.getRootElement()
    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement)

      setFloatingElemPosition(
        rangeRect,
        popupCharStylesEditorElem,
        anchorElem,
        isLink
      )
    }
  }, [editor, anchorElem, isLink])

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement

    const update = () => {
      editor.getEditorState().read(() => {
        $updateTextFormatFloatingToolbar()
      })
    }

    window.addEventListener("resize", update)
    if (scrollerElem) {
      scrollerElem.addEventListener("scroll", update)
    }

    return () => {
      window.removeEventListener("resize", update)
      if (scrollerElem) {
        scrollerElem.removeEventListener("scroll", update)
      }
    }
  }, [editor, $updateTextFormatFloatingToolbar, anchorElem])

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateTextFormatFloatingToolbar()
    })
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateTextFormatFloatingToolbar()
        })
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateTextFormatFloatingToolbar()
          return false
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, $updateTextFormatFloatingToolbar])

  return (
    <div
      ref={popupCharStylesEditorRef}
      className="bg-background absolute top-0 left-0 z-10 flex gap-1 rounded-md border p-1 opacity-0 shadow-md transition-opacity duration-300 will-change-transform"
    >
      {editor.isEditable() && (
        <>
          <ToggleGroup
            type="multiple"
            defaultValue={[
              isBold ? "bold" : "",
              isItalic ? "italic" : "",
              isUnderline ? "underline" : "",
              isStrikethrough ? "strikethrough" : "",
              isSubscript ? "subscript" : "",
              isSuperscript ? "superscript" : "",
              isCode ? "code" : "",
              isLink ? "link" : "",
            ]}
          >
            <ToggleGroupItem
              value="bold"
              aria-label="Toggle bold"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
              }}
              size="sm"
            >
              <BoldIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="italic"
              aria-label="Toggle italic"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
              }}
              size="sm"
            >
              <ItalicIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="underline"
              aria-label="Toggle underline"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
              }}
              size="sm"
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="strikethrough"
              aria-label="Toggle strikethrough"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
              }}
              size="sm"
            >
              <StrikethroughIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <Separator orientation="vertical" />
            <ToggleGroupItem
              value="code"
              aria-label="Toggle code"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")
              }}
              size="sm"
            >
              <CodeIcon className="h-4 w-4" />
            </ToggleGroupItem>
            
            <Separator orientation="vertical" />
          </ToggleGroup>
          <ToggleGroup
            type="single"
            defaultValue={
              isSubscript ? "subscript" : isSuperscript ? "superscript" : ""
            }
          >
            <ToggleGroupItem
              value="subscript"
              aria-label="Toggle subscript"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript")
              }}
              size="sm"
            >
              <SubscriptIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="superscript"
              aria-label="Toggle superscript"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript")
              }}
              size="sm"
            >
              <SuperscriptIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {aiEnabled && (
            <>
              <Separator orientation="vertical" />
              {aiStreaming ? (
                <button
                  className="inline-flex items-center justify-center rounded-sm h-8 px-2 text-muted-foreground"
                  onClick={() => { abortRef.current?.abort(); setAiStreaming(false); }}
                  title="Cancel"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="inline-flex items-center justify-center rounded-sm h-8 px-2 hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                      title="AI actions"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-4 [&_svg:not([class*='text-'])]:text-muted-foreground">
                        <Wand2 className="h-3.5 w-3.5 shrink-0" />
                        Improve
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => runAiAction('rewrite', { tone: 'professional' })}>Professional</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runAiAction('rewrite', { tone: 'casual' })}>Casual</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runAiAction('rewrite', { tone: 'friendly' })}>Friendly</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runAiAction('rewrite', { tone: 'formal' })}>Formal</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runAiAction('rewrite', { tone: 'concise' })}>Concise</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => runAiAction('fix_grammar')}>
                      <CheckCheck className="h-3.5 w-3.5 mr-2" />
                      Fix Grammar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAiAction('expand')}>
                      <Expand className="h-3.5 w-3.5 mr-2" />
                      Expand
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAiAction('summarize')}>
                      <Shrink className="h-3.5 w-3.5 mr-2" />
                      Summarize
                    </DropdownMenuItem>
                    {locales && locales.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="gap-4 [&_svg:not([class*='text-'])]:text-muted-foreground">
                            <Languages className="h-3.5 w-3.5 shrink-0" />
                            Translate
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {locales.map((loc) => (
                              <DropdownMenuItem key={loc} onClick={() => runAiAction('translate', { target_locale: loc })}>
                                <span className="uppercase text-xs font-medium w-6">{loc}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function useFloatingTextFormatToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLDivElement | null,
  setIsLinkEditMode: Dispatch<boolean>,
  aiEnabled?: boolean,
  locales?: string[],
): JSX.Element | null {
  const [isText, setIsText] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isSubscript, setIsSubscript] = useState(false)
  const [isSuperscript, setIsSuperscript] = useState(false)
  const [isCode, setIsCode] = useState(false)

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      // Should not to pop up the floating toolbar when using IME input
      if (editor.isComposing()) {
        return
      }
      const selection = $getSelection()
      const nativeSelection = window.getSelection()
      const rootElement = editor.getRootElement()

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false)
        return
      }

      if (!$isRangeSelection(selection)) {
        return
      }

      const node = getSelectedNode(selection)

      // Update text format
      setIsBold(selection.hasFormat("bold"))
      setIsItalic(selection.hasFormat("italic"))
      setIsUnderline(selection.hasFormat("underline"))
      setIsStrikethrough(selection.hasFormat("strikethrough"))
      setIsSubscript(selection.hasFormat("subscript"))
      setIsSuperscript(selection.hasFormat("superscript"))
      setIsCode(selection.hasFormat("code"))

      // Update links
      const parent = node.getParent()
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true)
      } else {
        setIsLink(false)
      }

      if (
        !$isCodeHighlightNode(selection.anchor.getNode()) &&
        selection.getTextContent() !== ""
      ) {
        setIsText($isTextNode(node) || $isParagraphNode(node))
      } else {
        setIsText(false)
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, "")
      if (!selection.isCollapsed() && rawTextContent === "") {
        setIsText(false)
        return
      }
    })
  }, [editor])

  useEffect(() => {
    document.addEventListener("selectionchange", updatePopup)
    return () => {
      document.removeEventListener("selectionchange", updatePopup)
    }
  }, [updatePopup])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updatePopup()
      }),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) {
          setIsText(false)
        }
      })
    )
  }, [editor, updatePopup])

  if (!isText || !anchorElem) {
    return null
  }

  return createPortal(
    <FloatingTextFormat
      editor={editor}
      anchorElem={anchorElem}
      isLink={isLink}
      isBold={isBold}
      isItalic={isItalic}
      isStrikethrough={isStrikethrough}
      isSubscript={isSubscript}
      isSuperscript={isSuperscript}
      isUnderline={isUnderline}
      isCode={isCode}
      setIsLinkEditMode={setIsLinkEditMode}
      aiEnabled={aiEnabled}
      locales={locales}
    />,
    anchorElem
  )
}

export function FloatingTextFormatToolbarPlugin({
  anchorElem,
  aiEnabled,
  locales,
}: {
  anchorElem: HTMLDivElement | null
  aiEnabled?: boolean
  locales?: string[]
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext()
  const { setIsLinkEditMode } = useFloatingLinkContext()

  return useFloatingTextFormatToolbar(editor, anchorElem, setIsLinkEditMode, aiEnabled, locales)
}
