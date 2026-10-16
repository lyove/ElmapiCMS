import { NotFoundError } from "@elmapicms/js-sdk";
import { elmapi } from "./elmapi-server";
import type {
  CaseStudyFields,
  ContactPageFields,
  ContentEntry,
  FaqFields,
  HomeHeroFields,
  InsightFields,
  ServiceFields,
  SiteSettingsFields,
  TeamMemberFields,
  TestimonialFields,
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

export async function getSiteSettings(): Promise<ContentEntry<SiteSettingsFields>> {
  return elmapi.content.list("site-settings", { state: "published" }) as Promise<
    ContentEntry<SiteSettingsFields>
  >;
}

export async function getHomeHero(): Promise<ContentEntry<HomeHeroFields>> {
  return elmapi.content.list("home-hero", { state: "published" }) as Promise<
    ContentEntry<HomeHeroFields>
  >;
}

export async function getContactPage(): Promise<ContentEntry<ContactPageFields>> {
  return elmapi.content.list("contact-page", { state: "published" }) as Promise<
    ContentEntry<ContactPageFields>
  >;
}

export async function getServices(): Promise<ContentEntry<ServiceFields>[]> {
  const res = await elmapi.content.list("services", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<ServiceFields>>(res).sort(bySortOrder);
}

export async function getTeamMembers(): Promise<ContentEntry<TeamMemberFields>[]> {
  const res = await elmapi.content.list("team-members", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<TeamMemberFields>>(res).sort(bySortOrder);
}

export async function getTestimonials(): Promise<ContentEntry<TestimonialFields>[]> {
  const res = await elmapi.content.list("testimonials", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<TestimonialFields>>(res).sort(bySortOrder);
}

export async function getFaqs(): Promise<ContentEntry<FaqFields>[]> {
  const res = await elmapi.content.list("faqs", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<FaqFields>>(res).sort(bySortOrder);
}

export async function getCaseStudies(): Promise<ContentEntry<CaseStudyFields>[]> {
  const res = await elmapi.content.list("case-studies", {
    state: "published",
    sort: "created_at:desc",
  });
  return asList<ContentEntry<CaseStudyFields>>(res);
}

export async function getFeaturedCaseStudies(): Promise<ContentEntry<CaseStudyFields>[]> {
  const all = await getCaseStudies();
  const featured = all.filter((entry) => Boolean(entry.fields.featured));
  if (featured.length > 0) return featured;
  return all.slice(0, 2);
}

export async function getCaseStudyBySlug(
  slug: string,
): Promise<ContentEntry<CaseStudyFields>> {
  const res = await elmapi.content.list("case-studies", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<CaseStudyFields>;
  if (!entry?.uuid) throw new NotFoundError("Case study not found");
  return entry;
}

export async function getInsights(): Promise<ContentEntry<InsightFields>[]> {
  const res = await elmapi.content.list("insights", {
    state: "published",
    sort: "published_at:desc",
  });
  return asList<ContentEntry<InsightFields>>(res);
}

export async function getInsightBySlug(slug: string): Promise<ContentEntry<InsightFields>> {
  const res = await elmapi.content.list("insights", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<InsightFields>;
  if (!entry?.uuid) throw new NotFoundError("Insight not found");
  return entry;
}

export async function getCaseStudySlugs(): Promise<string[]> {
  const studies = await getCaseStudies();
  return studies.map((s) => s.fields.slug).filter(Boolean) as string[];
}

export async function getInsightSlugs(): Promise<string[]> {
  const insights = await getInsights();
  return insights.map((i) => i.fields.slug).filter(Boolean) as string[];
}
