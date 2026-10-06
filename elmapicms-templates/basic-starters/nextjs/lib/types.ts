export type ContentEntry<TFields> = {
  uuid: string;
  locale: string;
  published_at?: string | null;
  fields: TFields;
};

export type SiteSettingsFields = {
  "site-name"?: string;
  tagline?: string;
  "seo-title"?: string;
  "seo-description"?: string;
};

export type NoteFields = {
  title?: string;
  slug?: string;
  body?: string;
  "seo-title"?: string;
  "seo-description"?: string;
  "author-name"?: string;
  "author-user-id"?: string;
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
  links?: Record<string, string | null>;
};
