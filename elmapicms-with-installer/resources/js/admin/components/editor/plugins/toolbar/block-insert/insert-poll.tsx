import { ListChecksIcon } from "lucide-react"

import { useToolbarContext } from "@/admin/components/editor/context/toolbar-context"
import { InsertPollDialog } from "@/admin/components/editor/plugins/poll-plugin"
import { SelectItem } from "@/admin/components/ui/select"

export function InsertPoll() {
  const { activeEditor, showModal } = useToolbarContext()

  return (
    <SelectItem
      value="poll"
      onPointerUp={() =>
        showModal("Insert Poll", (onClose) => (
          <InsertPollDialog activeEditor={activeEditor} onClose={onClose} />
        ))
      }
      className=""
    >
      <div className="flex items-center gap-1">
        <ListChecksIcon className="size-4" />
        <span>Poll</span>
      </div>
    </SelectItem>
  )
}
