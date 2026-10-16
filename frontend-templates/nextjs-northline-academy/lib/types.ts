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
export type HighlightItem = { title?: string; description?: string };
export type FeatureItem = { label?: string };
export type ValueItem = { title?: string; description?: string };

export type SiteSettingsFields = {
  "site-name"?: string;
  tagline?: string;
  "site-url"?: string;
  "seo-title-template"?: string;
  "default-meta-description"?: string;
  "default-og-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "contact-email"?: string;
  "footer-tagline"?: string;
  "member-cta-label"?: string;
  "member-cta-url"?: string;
  "nav-links"?: NavLink[];
};

export type HomePageFields = {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  "primary-cta-label"?: string;
  "primary-cta-url"?: string;
  "secondary-cta-label"?: string;
  "secondary-cta-url"?: string;
  "hero-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "featured-heading"?: string;
  "featured-intro"?: string;
  "membership-heading"?: string;
  "membership-body"?: string;
  highlights?: HighlightItem[];
  "paths-heading"?: string;
  "paths-intro"?: string;
  "instructors-heading"?: string;
  "instructors-intro"?: string;
  "stories-heading"?: string;
  "stories-intro"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type AboutPageFields = {
  heading?: string;
  intro?: string;
  "hero-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "mission-title"?: string;
  "mission-body"?: string;
  values?: ValueItem[];
  "approach-heading"?: string;
  "approach-intro"?: string;
  "approach-steps"?: ValueItem[];
  "team-heading"?: string;
  "team-intro"?: string;
  "cta-heading"?: string;
  "cta-body"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type PricingPageFields = {
  heading?: string;
  intro?: string;
  "faq-heading"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type ContactPageFields = {
  heading?: string;
  intro?: string;
  "support-note"?: string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type CategoryFields = {
  name?: string;
  slug?: string;
  description?: string;
};

export type ExpertiseItem = { label?: string };
export type OutcomeItem = { label?: string };

export type InstructorFields = {
  name?: string;
  slug?: string;
  role?: string;
  "short-bio"?: string;
  biography?: string;
  portrait?: ElmapiAsset[] | ElmapiAsset | null;
  expertise?: ExpertiseItem[];
  featured?: boolean;
  "sort-order"?: number | string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type PlanFields = {
  name?: string;
  slug?: string;
  "price-label"?: string;
  "billing-note"?: string;
  summary?: string;
  features?: FeatureItem[];
  highlighted?: boolean;
  "cta-label"?: string;
  "cta-url"?: string;
  "sort-order"?: number | string;
};

export type CourseFields = {
  title?: string;
  slug?: string;
  summary?: string;
  teaser?: string;
  cover?: ElmapiAsset[] | ElmapiAsset | null;
  body?: string;
  "member-only"?: boolean;
  "duration-label"?: string;
  level?: string;
  category?: ContentEntry<CategoryFields> | null;
  instructor?: ContentEntry<InstructorFields> | null;
  outcomes?: OutcomeItem[];
  "lesson-count"?: number | string;
  "sort-order"?: number | string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type LearningPathFields = {
  title?: string;
  slug?: string;
  summary?: string;
  introduction?: string;
  cover?: ElmapiAsset[] | ElmapiAsset | null;
  level?: string;
  "duration-label"?: string;
  courses?: ContentEntry<CourseFields>[];
  "lead-instructor"?: ContentEntry<InstructorFields> | null;
  "member-only"?: boolean;
  "sort-order"?: number | string;
  "meta-title"?: string;
  "meta-description"?: string;
};

export type TestimonialFields = {
  quote?: string;
  "member-name"?: string;
  "member-role"?: string;
  avatar?: ElmapiAsset[] | ElmapiAsset | null;
  featured?: boolean;
  "sort-order"?: number | string;
};

export type FaqFields = {
  question?: string;
  answer?: string;
  "sort-order"?: number | string;
};
