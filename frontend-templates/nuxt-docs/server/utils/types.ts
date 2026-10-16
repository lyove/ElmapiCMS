export type ContentEntry<TFields = Record<string, unknown>> = {
  uuid: string
  locale?: string
  published_at?: string | null
  fields: TFields
}

export type ElmapiAsset = {
  uuid?: string
  url?: string
  metadata?: {
    alt_text?: string | null
  } | null
}

export type SiteSettingsFields = {
  'site-name'?: string
  tagline?: string
  'site-url'?: string
  'seo-title'?: string
  'seo-description'?: string
  'home-intro'?: string
  'og-image'?: ElmapiAsset | ElmapiAsset[] | null
}

export type DocVersionFields = {
  label?: string
  slug?: string
  description?: string
  'sort-order'?: number | string
  'is-default'?: boolean
}

export type DocCategoryFields = {
  title?: string
  slug?: string
  description?: string
  'sort-order'?: number | string
  /** When false, sidebar starts collapsed until the user opens it. */
  'default-open'?: boolean
}

export type DocArticleFields = {
  title?: string
  slug?: string
  summary?: string
  body?: string
  category?: ContentEntry<DocCategoryFields> | null
  version?: ContentEntry<DocVersionFields> | null
  'sort-order'?: number | string
  'seo-title'?: string
  'seo-description'?: string
}

export type NavArticle = {
  uuid: string
  title: string
  slug: string
  summary: string
  sortOrder: number
}

export type NavCategory = {
  uuid: string
  title: string
  slug: string
  description: string
  sortOrder: number
  /** CMS default for first visit; user toggles override in localStorage. */
  defaultOpen: boolean
  articles: NavArticle[]
}

export type SearchItem = {
  title: string
  slug: string
  summary: string
  categoryTitle: string
}

export type TocItem = {
  id: string
  title: string
  depth: number
}
