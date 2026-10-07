import { ColumnFilter } from "@/admin/components/ui/data-table";

export interface ContentEntry {
    id: number;
    uuid: string;
    state: string;
    created_at: string;
    updated_at: string;
    published_at: string | null;
    creator: { name: string };
    updater: { name: string };
    locale: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export interface ColumnDef {
    header: string;
    accessorKey: string;
    cell?: (item: ContentEntry) => React.ReactNode;
    sortable?: boolean;
    align?: "left" | "center" | "right";
    width?: string;
    padding?: string;
    filter?: ColumnFilter;
    visible?: boolean;
}