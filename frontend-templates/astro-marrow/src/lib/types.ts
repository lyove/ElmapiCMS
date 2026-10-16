export type ElmapiAsset = {
  uuid: string;
  url: string;
  thumbnail_url?: string;
  filename?: string;
  metadata?: {
    alt_text?: string | null;
    title?: string | null;
    caption?: string | null;
  };
};

export type ContentEntry<TFields = Record<string, unknown>> = {
  uuid: string;
  locale: string;
  published_at?: string | null;
  fields: TFields;
};

export type SiteSettingsFields = {
  'site-name'?: string;
  tagline?: string;
  'site-url'?: string;
  address?: string;
  phone?: string;
  email?: string;
  hours?: string;
  'instagram-url'?: string;
  'reservation-url'?: string;
  'footer-blurb'?: string;
  'seo-title'?: string;
  'seo-description'?: string;
  'og-image'?: ElmapiAsset[] | ElmapiAsset | null;
};

export type HomePageFields = {
  'hero-eyebrow'?: string;
  'hero-headline'?: string;
  'hero-subhead'?: string;
  'hero-image'?: ElmapiAsset[] | ElmapiAsset | null;
  'hero-cta-label'?: string;
  'hero-cta-url'?: string;
  'thesis-headline'?: string;
  'thesis-body'?: string;
  'thesis-image'?: ElmapiAsset[] | ElmapiAsset | null;
  'featured-headline'?: string;
  'featured-dishes'?: ContentEntry<MenuItemFields>[] | null;
  'visit-cta-headline'?: string;
  'visit-cta-body'?: string;
  'visit-cta-label'?: string;
  'visit-cta-url'?: string;
  'seo-title'?: string;
  'seo-description'?: string;
  'seo-image'?: ElmapiAsset[] | ElmapiAsset | null;
};

export type MenuCategoryFields = {
  name?: string;
  slug?: string;
  description?: string;
  'sort-order'?: number | string;
};

export type MenuItemFields = {
  name?: string;
  slug?: string;
  description?: string;
  price?: string | number;
  dietary?: string;
  image?: ElmapiAsset[] | ElmapiAsset | null;
  category?: ContentEntry<MenuCategoryFields> | null;
  featured?: boolean;
  'sort-order'?: number | string;
};

export type PageSeoFields = {
  'seo-title'?: string;
  'seo-description'?: string;
  'seo-image'?: ElmapiAsset[] | ElmapiAsset | null;
};

export type PageMenuFields = PageSeoFields & {
  headline?: string;
  intro?: string;
};

export type PageAboutFields = PageSeoFields & {
  headline?: string;
  eyebrow?: string;
  body?: string;
  'pull-quote'?: string;
  'portrait-image'?: ElmapiAsset[] | ElmapiAsset | null;
  'atmosphere-image'?: ElmapiAsset[] | ElmapiAsset | null;
};

export type PageGalleryFields = PageSeoFields & {
  headline?: string;
  intro?: string;
};

export type GalleryImageFields = {
  image?: ElmapiAsset[] | ElmapiAsset | null;
  caption?: string;
  'sort-order'?: number | string;
  featured?: boolean;
};

export type PagePrivateDiningFields = PageSeoFields & {
  headline?: string;
  eyebrow?: string;
  body?: string;
  image?: ElmapiAsset[] | ElmapiAsset | null;
  'cta-label'?: string;
  'cta-url'?: string;
};

export type PageVisitFields = PageSeoFields & {
  headline?: string;
  intro?: string;
  'visit-notes'?: string;
  'map-embed-url'?: string;
};

export type PageJournalFields = PageSeoFields & {
  headline?: string;
  intro?: string;
};

export type PageReserveFields = PageSeoFields & {
  headline?: string;
  intro?: string;
  'side-notes'?: string;
  'success-message'?: string;
};

export type FaqFields = {
  question?: string;
  answer?: string;
  'sort-order'?: number | string;
};

export type JournalPostFields = PageSeoFields & {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  'cover-image'?: ElmapiAsset[] | ElmapiAsset | null;
};
