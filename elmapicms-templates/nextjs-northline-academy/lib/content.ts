import { NotFoundError } from "@elmapicms/js-sdk";
import { elmapi } from "./elmapi-server";
import type {
  AboutPageFields,
  CategoryFields,
  ContactPageFields,
  ContentEntry,
  CourseFields,
  FaqFields,
  HomePageFields,
  InstructorFields,
  LearningPathFields,
  PlanFields,
  PricingPageFields,
  SiteSettingsFields,
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

export async function getAboutPage(): Promise<ContentEntry<AboutPageFields>> {
  return elmapi.content.list("about-page", {
    state: "published",
  }) as Promise<ContentEntry<AboutPageFields>>;
}

export async function getPricingPage(): Promise<ContentEntry<PricingPageFields>> {
  return elmapi.content.list("pricing-page", {
    state: "published",
  }) as Promise<ContentEntry<PricingPageFields>>;
}

export async function getContactPage(): Promise<ContentEntry<ContactPageFields>> {
  return elmapi.content.list("contact-page", {
    state: "published",
  }) as Promise<ContentEntry<ContactPageFields>>;
}

export async function getPlans(): Promise<ContentEntry<PlanFields>[]> {
  const res = await elmapi.content.list("plans", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<PlanFields>>(res).sort(bySortOrder);
}

export async function getFaqs(): Promise<ContentEntry<FaqFields>[]> {
  const res = await elmapi.content.list("faqs", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<FaqFields>>(res).sort(bySortOrder);
}

export async function getCategories(): Promise<ContentEntry<CategoryFields>[]> {
  const res = await elmapi.content.list("categories", {
    state: "published",
    sort: "name:asc",
  });
  return asList<ContentEntry<CategoryFields>>(res);
}

export async function getInstructors(): Promise<ContentEntry<InstructorFields>[]> {
  const res = await elmapi.content.list("instructors", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<InstructorFields>>(res).sort(bySortOrder);
}

export async function getInstructorBySlug(
  slug: string,
): Promise<ContentEntry<InstructorFields>> {
  const res = await elmapi.content.list("instructors", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<InstructorFields>;
  if (!entry?.uuid) throw new NotFoundError("Instructor not found");
  return entry;
}

export async function getInstructorSlugs(): Promise<string[]> {
  const instructors = await getInstructors();
  return instructors.map((item) => item.fields.slug).filter(Boolean) as string[];
}

export async function getLearningPaths(): Promise<ContentEntry<LearningPathFields>[]> {
  const res = await elmapi.content.list("learning-paths", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<LearningPathFields>>(res).sort(bySortOrder);
}

export async function getLearningPathBySlug(
  slug: string,
): Promise<ContentEntry<LearningPathFields>> {
  const res = await elmapi.content.list("learning-paths", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<LearningPathFields>;
  if (!entry?.uuid) throw new NotFoundError("Learning path not found");
  return entry;
}

export async function getLearningPathSlugs(): Promise<string[]> {
  const paths = await getLearningPaths();
  return paths.map((item) => item.fields.slug).filter(Boolean) as string[];
}

export async function getTestimonials(): Promise<ContentEntry<TestimonialFields>[]> {
  const res = await elmapi.content.list("testimonials", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<TestimonialFields>>(res).sort(bySortOrder);
}

export async function getCourses(): Promise<ContentEntry<CourseFields>[]> {
  const res = await elmapi.content.list("courses", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<CourseFields>>(res).sort(bySortOrder);
}

export async function getCourseBySlug(
  slug: string,
): Promise<ContentEntry<CourseFields>> {
  const res = await elmapi.content.list("courses", {
    state: "published",
    where: { slug: { eq: slug } },
    first: true,
  });
  const entry = res as ContentEntry<CourseFields>;
  if (!entry?.uuid) throw new NotFoundError("Course not found");
  return entry;
}

export async function getCourseSlugs(): Promise<string[]> {
  const courses = await getCourses();
  return courses.map((c) => c.fields.slug).filter(Boolean) as string[];
}

export async function getCoursesByInstructor(
  instructorName: string,
): Promise<ContentEntry<CourseFields>[]> {
  const courses = await getCourses();
  return courses.filter(
    (course) => course.fields.instructor?.fields.name === instructorName,
  );
}

export async function getMemberCourses(): Promise<ContentEntry<CourseFields>[]> {
  const courses = await getCourses();
  return courses.filter((c) => Boolean(c.fields["member-only"]));
}
