import { useState } from "react"
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from "@lexical/markdown"
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin"
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin"
import { TablePlugin } from "@lexical/react/LexicalTablePlugin"

import { ContentEditable } from "@/admin/components/editor/editor-ui/content-editable"
import { BasicToolbar } from "@/admin/components/editor/plugins/toolbar/basic-toolbar"
import { ImagesPlugin } from "./plugins/images-plugin"
import { TableActionMenuPlugin } from "./plugins/table-action-menu-plugin"
import { TableHoverActionsPlugin } from "./plugins/table-hover-actions-plugin"
import { TableCellResizerPlugin } from "./plugins/table-cell-resizer-plugin"
import { TreeViewPlugin } from "./plugins/tree-view-plugin"
import { CounterCharacterPlugin } from "./plugins/counter-character-plugin"
import { MarkdownTogglePlugin } from "./plugins/markdown-toggle-plugin"
import { DraggableBlockPlugin } from "./plugins/draggable-block-plugin"
import { FloatingTextFormatToolbarPlugin } from "./plugins/floating-text-format-plugin"
export function Plugins({ aiEnabled, locales }: { aiEnabled?: boolean; locales?: string[] }) {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null)

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  return (
    <div className="relative">
      <BasicToolbar aiEnabled={aiEnabled} />
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="" ref={onRef}>
                <ContentEditable
                  placeholder="Start typing..."
                  className="ContentEditable__root relative block min-h-72 bg-sidebar px-8 py-4 text-sidebar-foreground focus:outline-none"
                />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        <ClickableLinkPlugin />
        <CheckListPlugin />
        <HorizontalRulePlugin />
        <TablePlugin />
        <ListPlugin />
        <TabIndentationPlugin />
        <HashtagPlugin />
        <HistoryPlugin />
        <ImagesPlugin />
        <TableActionMenuPlugin anchorElem={floatingAnchorElem} cellMerge={true} />
        <TableHoverActionsPlugin anchorElem={floatingAnchorElem} />
        <TableCellResizerPlugin />
        
        {/* Draggable block plugin for reordering blocks */}
        <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
        
        {/* Floating text format toolbar for text formatting + AI actions */}
        <FloatingTextFormatToolbarPlugin anchorElem={floatingAnchorElem} aiEnabled={aiEnabled} locales={locales} />

        <MarkdownShortcutPlugin
          transformers={[
            CHECK_LIST,
            ...ELEMENT_TRANSFORMERS,
            ...MULTILINE_ELEMENT_TRANSFORMERS,
            ...TEXT_FORMAT_TRANSFORMERS,
            ...TEXT_MATCH_TRANSFORMERS,
          ]}
        />
        
        {/* Character counter at the bottom */}
        <div className="flex justify-end rounded-b-md border-t border-sidebar-border/70 bg-sidebar/60 p-2">
          <CounterCharacterPlugin />
        </div>
      </div>
    </div>
  )
}
