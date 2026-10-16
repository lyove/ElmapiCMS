export interface Project {
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    preview_url: string | null;
    disk: 'public' | 's3';
    default_locale: string;
    locales?: string[];
    settings: Record<string, unknown> | null;
    public_api: boolean;
    project_auth_require_verified_email?: boolean;
    project_auth_email_verification_config?: Record<string, string> | null;
    created_at: string;
    updated_at: string;
    collections?: Collection[];
    collections_count?: number;
    assets_count?: number;
    content_count?: number;
}

export interface Collection {
    id: number;
    uuid: string;
    project_id: number;
    name: string;
    slug: string;
    order: number | null;
    description?: string;
    is_singleton?: boolean;
    created_at: string;
    updated_at: string;
    fields?: Field[];
}

export interface Field {
    id: number;
    project_id: number;
    collection_id: number;
    name: string;
    label: string;
    type:
        | 'text'
        | 'longtext'
        | 'richtext'
        | 'slug'
        | 'email'
        | 'password'
        | 'number'
        | 'enumeration'
        | 'boolean'
        | 'color'
        | 'date'
        | 'time'
        | 'media'
        | 'relation'
        | 'json'
        | 'group'
        | string;
    required: boolean;
    order?: number;
    parent_field_id?: number | null;
    children?: Field[];
    description?: string;
    placeholder?: string;
    validations?: Record<string, { status?: boolean; [key: string]: unknown }>;
    options?: {
        repeatable?: boolean;
        hideInContentList?: boolean;
        hiddenInAPI?: boolean;
        includeTime?: boolean;
        mode?: 'single' | 'range';
        editor?: {
            type: number;
            mode?: 'lexical' | 'markdown';
            outputFormat?: 'html' | 'lexical' | 'markdown';
        };
        enumeration?: {
            list: string[];
        };
        multiple?: boolean;
        relation?: {
            collection: number | null;
            type: number;
        };
        slug?: {
            field: string | null;
            readonly: boolean;
        };
        media?: {
            type: number;
        };
        includeDraft?: boolean;
    };
    created_at: string;
    updated_at: string;
}

export interface AssetMetadata {
    width?: number;
    height?: number;
    alt_text?: string;
    title?: string;
    caption?: string;
    description?: string;
    author?: string;
    copyright?: string;
}

export interface AssetUsageEntry {
    entry_id: number;
    entry_uuid: string;
    collection_name?: string | null;
    field_name?: string | null;
    field_label?: string | null;
    locale?: string | null;
    state?: string | null;
}

export interface AssetUsageSummary {
    total_relations: number;
    total_entries: number;
    entries: AssetUsageEntry[];
}

export interface Asset {
    id: number;
    uuid: string;
    filename: string;
    original_filename: string;
    mime_type: string;
    extension: string;
    size: number;
    disk: string;
    path: string;
    url: string;
    original_url?: string | null;
    full_url?: string;
    thumbnail_url: string | null;
    formatted_size: string;
    metadata: AssetMetadata | null;
    pending_image_processing?: boolean;
    usage_summary?: AssetUsageSummary;
    created_at: string;
    updated_at: string;
}
