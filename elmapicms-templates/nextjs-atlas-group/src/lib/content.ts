import { NotFoundError } from "@elmapicms/js-sdk";
import type { Locale } from "@/i18n/config";
import { elmapi } from "./elmapi-server";
import type {
  AboutPageFields,
  AuthorFields,
  BlogCategoryFields,
  BlogPostFields,
  CaseStudyFields,
  ContactPageFields,
  ContentEntry,
  FaqFields,
  HomePageFields,
  LocationFields,
  ServiceFields,
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
  const av = Number(a.fields["sort-order"] ?? 0);
  const bv = Number(b.fields["sort-order"] ?? 0);
  return av - bv;
}

export async function getSiteSettings(
  locale: Locale,
): Promise<ContentEntry<SiteSettingsFields>> {
  return elmapi.content.list("site-settings", {
    state: "published",
    locale,
  }) as Promise<ContentEntry<SiteSettingsFields>>;
}

export async function getHomePage(locale: Locale): Promise<ContentEntry<HomePageFields>> {
  return elmapi.content.list("home-page", {
    state: "published",
    locale,
  }) as Promise<ContentEntry<HomePageFields>>;
}

export async function getAboutPage(locale: Locale): Promise<ContentEntry<AboutPageFields>> {
  return elmapi.content.list("about-page", {
    state: "published",
    locale,
  }) as Promise<ContentEntry<AboutPageFields>>;
}

export async function getContactPage(
  locale: Locale,
): Promise<ContentEntry<ContactPageFields>> {
  return elmapi.content.list("contact-page", {
    state: "published",
    locale,
  }) as Promise<ContentEntry<ContactPageFields>>;
}

export async function getServices(locale: Locale): Promise<ContentEntry<ServiceFields>[]> {
  const res = await elmapi.content.list("services", {
    state: "published",
    locale,
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<ServiceFields>>(res).sort(bySortOrder);
}

export async function getServiceBySlug(
  locale: Locale,
  slug: string,
): Promise<ContentEntry<ServiceFields>> {
  const res = await elmapi.content.list("services", {
    state: "published",
    locale,
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<ServiceFields>;
  if (!entry?.uuid) throw new NotFoundError("Service not found");
  return entry;
}

export async function getServiceSlugs(): Promise<string[]> {
  const services = await getServices("en");
  return services.map((s) => s.fields.slug).filter(Boolean) as string[];
}

export async function getAuthors(): Promise<ContentEntry<AuthorFields>[]> {
  const res = await elmapi.content.list("authors", { state: "published", sort: "sort-order:asc" });
  return asList<ContentEntry<AuthorFields>>(res).sort(bySortOrder);
}

export async function getBlogCategories(
  locale: Locale,
): Promise<ContentEntry<BlogCategoryFields>[]> {
  const res = await elmapi.content.list("blog-categories", {
    state: "published",
    locale,
    sort: "name:asc",
  });
  return asList<ContentEntry<BlogCategoryFields>>(res);
}

export async function getBlogPosts(
  locale: Locale,
  options?: { categorySlug?: string },
): Promise<ContentEntry<BlogPostFields>[]> {
  const res = await elmapi.content.list("blog-posts", {
    state: "published",
    locale,
    sort: "published_at:desc",
  });
  const posts = asList<ContentEntry<BlogPostFields>>(res);
  if (!options?.categorySlug) return posts;
  return posts.filter((post) => post.fields.category?.fields?.slug === options.categorySlug);
}

export async function getFeaturedBlogPosts(
  locale: Locale,
): Promise<ContentEntry<BlogPostFields>[]> {
  const posts = await getBlogPosts(locale);
  const featured = posts.filter((post) => Boolean(post.fields.featured));
  return (featured.length > 0 ? featured : posts).slice(0, 3);
}

export async function getBlogPostBySlug(
  locale: Locale,
  slug: string,
): Promise<ContentEntry<BlogPostFields>> {
  const res = await elmapi.content.list("blog-posts", {
    state: "published",
    locale,
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<BlogPostFields>;
  if (!entry?.uuid) throw new NotFoundError("Blog post not found");
  return entry;
}

export async function getBlogPostSlugs(): Promise<string[]> {
  const posts = await getBlogPosts("en");
  return posts.map((p) => p.fields.slug).filter(Boolean) as string[];
}

export async function getFaqs(locale: Locale): Promise<ContentEntry<FaqFields>[]> {
  const res = await elmapi.content.list("faqs", {
    state: "published",
    locale,
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<FaqFields>>(res).sort(bySortOrder);
}

export async function getCaseStudies(
  locale: Locale,
): Promise<ContentEntry<CaseStudyFields>[]> {
  const res = await elmapi.content.list("case-studies", {
    state: "published",
    locale,
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<CaseStudyFields>>(res).sort(bySortOrder);
}

export async function getFeaturedCaseStudies(
  locale: Locale,
): Promise<ContentEntry<CaseStudyFields>[]> {
  const studies = await getCaseStudies(locale);
  const featured = studies.filter((item) => Boolean(item.fields.featured));
  return (featured.length > 0 ? featured : studies).slice(0, 3);
}

export async function getCaseStudyBySlug(
  locale: Locale,
  slug: string,
): Promise<ContentEntry<CaseStudyFields>> {
  const res = await elmapi.content.list("case-studies", {
    state: "published",
    locale,
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<CaseStudyFields>;
  if (!entry?.uuid) throw new NotFoundError("Case study not found");
  return entry;
}

export async function getCaseStudySlugs(): Promise<string[]> {
  const studies = await getCaseStudies("en");
  return studies.map((item) => item.fields.slug).filter(Boolean) as string[];
}

export async function getLocations(
  locale: Locale,
): Promise<ContentEntry<LocationFields>[]> {
  const res = await elmapi.content.list("locations", {
    state: "published",
    locale,
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<LocationFields>>(res).sort(bySortOrder);
}

export async function getLocationBySlug(
  locale: Locale,
  slug: string,
): Promise<ContentEntry<LocationFields>> {
  const res = await elmapi.content.list("locations", {
    state: "published",
    locale,
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<LocationFields>;
  if (!entry?.uuid) throw new NotFoundError("Location not found");
  return entry;
}

export async function getLocationSlugs(): Promise<string[]> {
  const locations = await getLocations("en");
  return locations.map((item) => item.fields.slug).filter(Boolean) as string[];
}
