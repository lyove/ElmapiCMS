import { ListChecksIcon } from "lucide-react"

import { ComponentPickerOption } from "@/admin/components/editor/plugins/picker/component-picker-option"
import { InsertPollDialog } from "@/admin/components/editor/plugins/poll-plugin"

export function PollPickerPlugin() {
  return new ComponentPickerOption("Poll", {
    icon: <ListChecksIcon className="size-4" />,
    keywords: ["poll", "vote"],
    onSelect: (_, editor, showModal) =>
      showModal("Insert Poll", (onClose) => (
        <InsertPollDialog activeEditor={editor} onClose={onClose} />
      )),
  })
}
