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
export type StatItem = { label?: string; value?: string };
export type ProcessStep = { "step-number"?: string; title?: string; body?: string };
export type ResultItem = { label?: string; value?: string };
export type BenefitItem = { label?: string };

export type SiteSettingsFields = {
  "company-name"?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  "service-area"?: string;
  "site-url"?: string;
  "seo-title-template"?: string;
  "default-meta-description"?: string;
  "default-og-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "footer-tagline"?: string;
  "newsletter-title"?: string;
  navigation?: NavLink[];
  "license-number"?: string;
  "years-label"?: string;
  "show-utility-bar"?: boolean;
};

export type HomePageFields = {
  "hero-eyebrow"?: string;
  "hero-headline"?: string;
  "hero-subhead"?: string;
  "hero-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "hero-cta-label"?: string;
  "hero-cta-href"?: string;
  "hero-secondary-cta-label"?: string;
  "hero-secondary-cta-href"?: string;
  "value-prop-title"?: string;
  "value-prop-body"?: string;
  "services-section-title"?: string;
  "featured-services"?: ContentEntry<ServiceFields>[];
  "projects-section-title"?: string;
  "featured-projects"?: ContentEntry<ProjectFields>[];
  "trust-stats"?: StatItem[];
  "certifications-title"?: string;
  "certifications-body"?: string;
  "cta-title"?: string;
  "cta-body"?: string;
  "cta-label"?: string;
  "cta-href"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type ServiceFields = {
  title?: string;
  slug?: string;
  summary?: string;
  body?: string;
  image?: ElmapiAsset[] | ElmapiAsset | null;
  "icon-label"?: string;
  benefits?: BenefitItem[];
  featured?: boolean;
  "sort-order"?: string | number;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type ProjectFields = {
  title?: string;
  slug?: string;
  summary?: string;
  body?: string;
  location?: string;
  "project-type"?: string | string[];
  "hero-image"?: ElmapiAsset[] | ElmapiAsset | null;
  gallery?: ElmapiAsset[] | ElmapiAsset | null;
  results?: ResultItem[];
  "related-services"?: ContentEntry<ServiceFields>[];
  featured?: boolean;
  year?: string;
  client?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type AboutPageFields = {
  title?: string;
  intro?: string;
  body?: string;
  image?: ElmapiAsset[] | ElmapiAsset | null;
  "team-intro"?: string;
  "safety-title"?: string;
  "safety-body"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type ProcessPageFields = {
  title?: string;
  intro?: string;
  steps?: ProcessStep[];
  "meta-title"?: string;
  "meta-description"?: string;
};

export type ContactPageFields = {
  title?: string;
  intro?: string;
  "form-title"?: string;
  "form-intro"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type TeamMemberFields = {
  name?: string;
  role?: string;
  bio?: string;
  photo?: ElmapiAsset[] | ElmapiAsset | null;
  "sort-order"?: string | number;
};

export type TestimonialFields = {
  quote?: string;
  "author-name"?: string;
  "author-role"?: string;
  company?: string;
  "sort-order"?: string | number;
};

export type FaqFields = {
  question?: string;
  answer?: string;
  "sort-order"?: string | number;
};
