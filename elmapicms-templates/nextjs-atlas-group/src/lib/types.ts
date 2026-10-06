export type ElmapiAsset = {
  uuid: string;
  url: string;
  thumbnail_url?: string;
  original_url?: string;
  filename?: string;
  metadata?: { alt_text?: string | null; width?: number; height?: number };
};

export type ContentEntry<T extends Record<string, unknown> = Record<string, unknown>> = {
  uuid: string;
  locale: string;
  published_at: string | null;
  fields: T;
};

export type NavLink = { label?: string; url?: string };
export type SocialLink = { platform?: string; url?: string };

export type SiteSettingsFields = {
  "site-name"?: string;
  tagline?: string;
  "site-url"?: string;
  "seo-title-template"?: string;
  "default-meta-description"?: string;
  "default-og-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "contact-email"?: string;
  "contact-phone"?: string;
  address?: string;
  "nav-links"?: NavLink[];
  "social-links"?: SocialLink[];
  "footer-tagline"?: string;
};

export type StatItem = { value?: string; label?: string };
export type HighlightItem = { title?: string; description?: string; icon?: string };

export type HomePageFields = {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  "primary-cta-label"?: string;
  "primary-cta-url"?: string;
  "secondary-cta-label"?: string;
  "secondary-cta-url"?: string;
  "hero-image"?: ElmapiAsset[] | ElmapiAsset | null;
  stats?: StatItem[];
  "intro-heading"?: string;
  "intro-body"?: string;
  "intro-image"?: ElmapiAsset[] | ElmapiAsset | null;
  highlights?: HighlightItem[];
  "meta-title"?: string;
  "meta-description"?: string;
};

export type ValueItem = { title?: string; description?: string };
export type MilestoneItem = { year?: string; description?: string };

export type AboutPageFields = {
  heading?: string;
  intro?: string;
  "hero-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "mission-title"?: string;
  "mission-body"?: string;
  values?: ValueItem[];
  milestones?: MilestoneItem[];
  "team-heading"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type DeliverableItem = { label?: string };

export type ServiceFields = {
  title?: string;
  slug?: string;
  summary?: string;
  description?: string;
  icon?: string;
  deliverables?: DeliverableItem[];
  "sort-order"?: number | string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type ResultItem = { value?: string; label?: string };

export type CaseStudyFields = {
  title?: string;
  slug?: string;
  client?: string;
  region?: string;
  industry?: string;
  summary?: string;
  body?: string;
  "featured-image"?: ElmapiAsset[] | ElmapiAsset | null;
  results?: ResultItem[];
  services?: ContentEntry<ServiceFields>[] | null;
  featured?: boolean;
  "sort-order"?: number | string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type LocationFields = {
  name?: string;
  slug?: string;
  city?: string;
  country?: string;
  region?: string;
  address?: string;
  phone?: string;
  email?: string;
  "office-hours"?: string;
  summary?: string;
  body?: string;
  image?: ElmapiAsset[] | ElmapiAsset | null;
  "is-headquarters"?: boolean;
  services?: ContentEntry<ServiceFields>[] | null;
  "sort-order"?: number | string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type BlogCategoryFields = {
  name?: string;
  slug?: string;
};

export type AuthorFields = {
  name?: string;
  role?: string;
  bio?: string;
  photo?: ElmapiAsset[] | ElmapiAsset | null;
  "sort-order"?: number | string;
};

export type BlogPostFields = {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  "featured-image"?: ElmapiAsset[] | ElmapiAsset | null;
  category?: ContentEntry<BlogCategoryFields> | null;
  author?: ContentEntry<AuthorFields> | null;
  featured?: boolean;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type FaqFields = {
  question?: string;
  answer?: string;
  "sort-order"?: number | string;
};

export type ContactPageFields = {
  heading?: string;
  intro?: string;
  "office-hours"?: string;
  "form-name-label"?: string;
  "form-email-label"?: string;
  "form-message-label"?: string;
  "form-submit-label"?: string;
  "success-message"?: string;
  "error-message"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};
