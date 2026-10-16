export type MediaAsset = {
  uuid: string
  url?: string
  thumbnail_url?: string
  original_url?: string
  filename?: string
  metadata?: {
    alt_text?: string | null
    width?: number | null
    height?: number | null
  } | null
}

export type ContentEntry<T extends Record<string, unknown> = Record<string, unknown>> = {
  uuid: string
  locale?: string
  published_at?: string | null
  fields: T
}

export type RelatedEntry<T extends Record<string, unknown> = Record<string, unknown>> =
  | ContentEntry<T>
  | null
  | undefined

export type SiteSettingsFields = {
  'site-name'?: string
  'site-url'?: string
  'seo-title'?: string
  'seo-description'?: string
  'og-image'?: MediaAsset[]
  'primary-cta-label'?: string
  'primary-cta-url'?: string
  'contact-email'?: string
  'footer-blurb'?: string
  'twitter-url'?: string
  'linkedin-url'?: string
  'github-url'?: string
}

export type ComparisonColumn = {
  label?: string
  tone?: string | string[]
  points?: string
}

export type StatItem = {
  value?: string
  label?: string
}

export type BeliefItem = {
  title?: string
  body?: string
}

export type ChannelItem = {
  title?: string
  body?: string
  meta?: string
}

export type HomeFields = {
  headline?: string
  subheadline?: string
  'primary-cta-label'?: string
  'primary-cta-url'?: string
  'secondary-cta-label'?: string
  'secondary-cta-url'?: string
  'hero-image'?: MediaAsset[]
  'thesis-title'?: string
  'thesis-body'?: string
  'features-title'?: string
  'features-intro'?: string
  'social-proof-title'?: string
  'testimonials-title'?: string
  'pricing-teaser-title'?: string
  'pricing-teaser-intro'?: string
  'benefits-title'?: string
  'comparison-columns'?: ComparisonColumn[]
  stats?: StatItem[]
  'cta-title'?: string
  'cta-body'?: string
  'seo-title'?: string
  'seo-description'?: string
}

export type FeatureFields = {
  title?: string
  slug?: string
  icon?: string
  summary?: string
  body?: string
  image?: MediaAsset[]
  order?: number
  'seo-title'?: string
  'seo-description'?: string
}

export type PricingPlanFields = {
  name?: string
  price?: string
  period?: string
  description?: string
  features?: string
  'cta-label'?: string
  'cta-url'?: string
  highlighted?: boolean
  order?: number
}

export type TestimonialFields = {
  quote?: string
  'author-name'?: string
  role?: string
  company?: string
  avatar?: MediaAsset[]
  order?: number
}

export type CustomerFields = {
  name?: string
  order?: number
}

export type ChangelogFields = {
  title?: string
  slug?: string
  version?: string
  summary?: string
  body?: string
  'seo-title'?: string
  'seo-description'?: string
}

export type BlogCategoryFields = {
  name?: string
}

export type BlogAuthorFields = {
  name?: string
}

export type BlogPostFields = {
  title?: string
  slug?: string
  excerpt?: string
  body?: string
  'cover-image'?: MediaAsset[]
  category?: RelatedEntry<BlogCategoryFields>
  author?: RelatedEntry<BlogAuthorFields>
  'seo-title'?: string
  'seo-description'?: string
  'og-image'?: MediaAsset[]
}

export type FaqFields = {
  question?: string
  answer?: string
  order?: number
}

export type PageFields = {
  title?: string
  intro?: string
  body?: string
  image?: MediaAsset[]
  footnote?: string
  'form-success'?: string
  'seo-title'?: string
  'seo-description'?: string
  // About
  'story-eyebrow'?: string
  'story-title'?: string
  'beliefs-title'?: string
  beliefs?: BeliefItem[]
  'customers-label'?: string
  'cta-title'?: string
  'cta-body'?: string
  'cta-primary-label'?: string
  'cta-primary-url'?: string
  'cta-secondary-label'?: string
  'cta-secondary-url'?: string
  // Contact
  'email-helper'?: string
  channels?: ChannelItem[]
  'form-title'?: string
  'form-intro'?: string
  'faq-title'?: string
  'cta-label'?: string
  'cta-url'?: string
  // Features page
  'highlight-eyebrow'?: string
  'highlight-title'?: string
  'highlight-body'?: string
  'primary-cta-label'?: string
  'primary-cta-url'?: string
  'secondary-cta-label'?: string
  'secondary-cta-url'?: string
}
