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

export type OrderStatus =
  | "placed"
  | "pending_payment"
  | "confirmed"
  | "fulfilled"
  | "cancelled";

export type LineItem = {
  productUuid: string;
  slug: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type SiteSettingsFields = {
  "site-name"?: string;
  description?: string;
  "site-url"?: string;
  "seo-title"?: string;
  "seo-description"?: string;
  "og-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "currency-label"?: string;
  "currency-symbol"?: string;
  "contact-email"?: string;
  "contact-phone"?: string;
  "store-address"?: string;
  "footer-blurb"?: string;
  "shipping-note"?: string;
  "payment-note"?: string;
  "flat-shipping"?: number | string;
  "free-shipping-threshold"?: number | string;
};

export type HomePageFields = {
  "hero-headline"?: string;
  "hero-subheadline"?: string;
  "hero-cta-label"?: string;
  "hero-cta-href"?: string;
  "hero-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "featured-heading"?: string;
  "featured-intro"?: string;
  "categories-heading"?: string;
  "categories-intro"?: string;
  "seo-title"?: string;
  "seo-description"?: string;
};

export type CategoryFields = {
  title?: string;
  slug?: string;
  summary?: string;
  image?: ElmapiAsset[] | ElmapiAsset | null;
  "sort-order"?: number | string;
  "seo-title"?: string;
  "seo-description"?: string;
  parent?: ContentEntry<CategoryFields> | null;
};

export type ProductFields = {
  title?: string;
  slug?: string;
  summary?: string;
  description?: string;
  price?: number | string;
  "compare-at-price"?: number | string | null;
  "in-stock"?: boolean;
  featured?: boolean;
  "primary-image"?: ElmapiAsset[] | ElmapiAsset | null;
  gallery?: ElmapiAsset[] | ElmapiAsset | null;
  category?: ContentEntry<CategoryFields> | null;
  materials?: string;
  dimensions?: string;
  "seo-title"?: string;
  "seo-description"?: string;
};

export type PageFields = {
  title?: string;
  slug?: string;
  summary?: string;
  body?: string;
  "hero-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "seo-title"?: string;
  "seo-description"?: string;
};

export type FaqItemFields = {
  question?: string;
  answer?: string;
  "sort-order"?: number | string;
};

export type BlogTopic = "materials" | "studio" | "styling" | "makers";

export const BLOG_TOPIC_LABELS: Record<BlogTopic, string> = {
  materials: "Materials",
  studio: "Studio",
  styling: "Styling",
  makers: "Makers",
};

export type BlogPostFields = {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  "cover-image"?: ElmapiAsset[] | ElmapiAsset | null;
  "author-name"?: string;
  topic?: BlogTopic | string;
  featured?: boolean;
  "seo-title"?: string;
  "seo-description"?: string;
};

/** One row of the orders `line-items` repeatable group. */
export type OrderLineItemFields = {
  product?: ContentEntry<ProductFields> | string | null;
  title?: string;
  slug?: string;
  quantity?: number | string;
  "unit-price"?: number | string;
  "image-url"?: string;
};

export type OrderFields = {
  "order-number"?: string;
  /** Enumeration may arrive as a string or a one-item array from the API. */
  status?: OrderStatus | OrderStatus[] | string | string[];
  /** Repeatable group of line items (legacy JSON string still accepted when reading). */
  "line-items"?: OrderLineItemFields[] | string | LineItem[];
  subtotal?: number | string;
  "shipping-total"?: number | string;
  total?: number | string;
  currency?: string;
  "customer-user-id"?: string;
  "customer-name"?: string;
  "customer-email"?: string;
  "shipping-name"?: string;
  "shipping-line1"?: string;
  "shipping-line2"?: string;
  "shipping-city"?: string;
  "shipping-region"?: string;
  "shipping-postal"?: string;
  "shipping-country"?: string;
  "shipping-phone"?: string;
  notes?: string;
  "payment-method-note"?: string;
};
