import { ListCollapseIcon } from "lucide-react"

import { INSERT_COLLAPSIBLE_COMMAND } from "@/admin/components/editor/plugins/collapsible-plugin"
import { ComponentPickerOption } from "@/admin/components/editor/plugins/picker/component-picker-option"

export function CollapsiblePickerPlugin() {
  return new ComponentPickerOption("Collapsible", {
    icon: <ListCollapseIcon className="size-4" />,
    keywords: ["collapse", "collapsible", "toggle"],
    onSelect: (_, editor) =>
      editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined),
  })
}
