import { NotFoundError } from "@elmapicms/js-sdk";
import { elmapi } from "./elmapi-server";
import type {
  AboutPageFields,
  ContactPageFields,
  ContentEntry,
  FaqFields,
  HomePageFields,
  ProcessPageFields,
  ProjectFields,
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

export async function getHomePage(): Promise<ContentEntry<HomePageFields>> {
  return elmapi.content.list("home-page", { state: "published" }) as Promise<
    ContentEntry<HomePageFields>
  >;
}

export async function getAboutPage(): Promise<ContentEntry<AboutPageFields>> {
  return elmapi.content.list("about-page", { state: "published" }) as Promise<
    ContentEntry<AboutPageFields>
  >;
}

export async function getProcessPage(): Promise<ContentEntry<ProcessPageFields>> {
  return elmapi.content.list("process-page", { state: "published" }) as Promise<
    ContentEntry<ProcessPageFields>
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

export async function getServiceBySlug(
  slug: string,
): Promise<ContentEntry<ServiceFields>> {
  const res = await elmapi.content.list("services", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<ServiceFields>;
  if (!entry?.uuid) throw new NotFoundError("Service not found");
  return entry;
}

export async function getProjects(): Promise<ContentEntry<ProjectFields>[]> {
  const res = await elmapi.content.list("projects", {
    state: "published",
    sort: "created_at:desc",
  });
  return asList<ContentEntry<ProjectFields>>(res);
}

export async function getProjectBySlug(
  slug: string,
): Promise<ContentEntry<ProjectFields>> {
  const res = await elmapi.content.list("projects", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<ProjectFields>;
  if (!entry?.uuid) throw new NotFoundError("Project not found");
  return entry;
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
