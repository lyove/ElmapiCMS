import { NotFoundError } from "@elmapicms/js-sdk";
import {
  resolveShippingRates,
  type ShippingRates,
} from "@/lib/cart-shared";
import { elmapi } from "./elmapi-server";
import type {
  BlogPostFields,
  CategoryFields,
  ContentEntry,
  FaqItemFields,
  HomePageFields,
  OrderFields,
  PageFields,
  ProductFields,
  SiteSettingsFields,
} from "./types";

export function asList<T>(response: T[] | { data: T[] } | unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T[] }).data;
  }
  return [];
}

function bySortOrder<T extends { fields: { "sort-order"?: string | number } }>(
  a: T,
  b: T,
): number {
  return Number(a.fields["sort-order"] ?? 0) - Number(b.fields["sort-order"] ?? 0);
}

export async function getSiteSettings(): Promise<ContentEntry<SiteSettingsFields>> {
  return elmapi.content.list("site-settings", {
    state: "published",
  }) as Promise<ContentEntry<SiteSettingsFields>>;
}

export async function getHomePage(): Promise<ContentEntry<HomePageFields>> {
  return elmapi.content.list("home-page", {
    state: "published",
  }) as Promise<ContentEntry<HomePageFields>>;
}

export async function getCategories(): Promise<ContentEntry<CategoryFields>[]> {
  const res = await elmapi.content.list("categories", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<CategoryFields>>(res).sort(bySortOrder);
}

export async function getProducts(): Promise<ContentEntry<ProductFields>[]> {
  const res = await elmapi.content.list("products", {
    state: "published",
    sort: "title:asc",
  });
  return asList<ContentEntry<ProductFields>>(res);
}

export async function getFeaturedProducts(): Promise<ContentEntry<ProductFields>[]> {
  const products = await getProducts();
  return products.filter((product) => Boolean(product.fields.featured));
}

export async function getProductBySlug(
  slug: string,
): Promise<ContentEntry<ProductFields>> {
  const res = await elmapi.content.list("products", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<ProductFields>;
  if (!entry?.uuid) throw new NotFoundError("Product not found");
  return entry;
}

export async function getProductSlugs(): Promise<string[]> {
  const products = await getProducts();
  return products.map((item) => item.fields.slug).filter(Boolean) as string[];
}

export async function getPageBySlug(
  slug: string,
): Promise<ContentEntry<PageFields>> {
  const res = await elmapi.content.list("pages", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<PageFields>;
  if (!entry?.uuid) throw new NotFoundError("Page not found");
  return entry;
}

export async function getFaqItems(): Promise<ContentEntry<FaqItemFields>[]> {
  const res = await elmapi.content.list("faq-items", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<FaqItemFields>>(res).sort(bySortOrder);
}

export async function getBlogPosts(options?: {
  topic?: string;
}): Promise<ContentEntry<BlogPostFields>[]> {
  const res = await elmapi.content.list("blog-posts", {
    state: "published",
    sort: "published_at:desc",
    ...(options?.topic
      ? { where: { topic: { eq: options.topic } } }
      : {}),
  });
  return asList<ContentEntry<BlogPostFields>>(res);
}

export async function getFeaturedBlogPosts(
  limit = 3,
): Promise<ContentEntry<BlogPostFields>[]> {
  const posts = await getBlogPosts();
  const featured = posts.filter((post) => Boolean(post.fields.featured));
  return (featured.length > 0 ? featured : posts).slice(0, limit);
}

export async function getBlogPostBySlug(
  slug: string,
): Promise<ContentEntry<BlogPostFields>> {
  const res = await elmapi.content.list("blog-posts", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<BlogPostFields>;
  if (!entry?.uuid) throw new NotFoundError("Blog post not found");
  return entry;
}

export async function getBlogPostSlugs(): Promise<string[]> {
  const posts = await getBlogPosts();
  return posts.map((item) => item.fields.slug).filter(Boolean) as string[];
}

export async function getOrderByUuid(
  uuid: string,
): Promise<ContentEntry<OrderFields>> {
  return elmapi.content.get("orders", uuid) as Promise<ContentEntry<OrderFields>>;
}

export async function getOrdersForCustomer(
  customerUserId: string,
): Promise<ContentEntry<OrderFields>[]> {
  const res = await elmapi.content.list("orders", {
    state: "published",
    where: { "customer-user-id": { eq: customerUserId } },
    sort: "published_at:desc",
  });
  return asList<ContentEntry<OrderFields>>(res);
}

export { productInStock, productPrice } from "@/lib/product";

export function shippingRatesFromSettings(
  settings: ContentEntry<SiteSettingsFields>,
): ShippingRates {
  return resolveShippingRates({
    flatShipping: settings.fields["flat-shipping"],
    freeShippingThreshold: settings.fields["free-shipping-threshold"],
  });
}

export {
  getCategoryTree,
  getRootCategories,
  getSubcategories,
  productMatchesCategory,
  type CategoryTreeNode,
} from "@/lib/categories";
