import type { MetadataRoute } from "next";
import {
  getCourseSlugs,
  getInstructorSlugs,
  getLearningPathSlugs,
  getSiteSettings,
} from "@/lib/content";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const settings = await getSiteSettings();
    base = siteUrl(settings);
  } catch {
    // fallback already set
  }
  base = base.replace(/\/$/, "");

  let courseSlugs: string[] = [];
  let pathSlugs: string[] = [];
  let instructorSlugs: string[] = [];
  try {
    [courseSlugs, pathSlugs, instructorSlugs] = await Promise.all([
      getCourseSlugs(),
      getLearningPathSlugs(),
      getInstructorSlugs(),
    ]);
  } catch {
    courseSlugs = [];
    pathSlugs = [];
    instructorSlugs = [];
  }

  const staticRoutes = [
    "",
    "/about",
    "/pricing",
    "/contact",
    "/courses",
    "/paths",
    "/instructors",
  ].map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
  }));

  const courseRoutes = courseSlugs.map((slug) => ({
    url: `${base}/courses/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const pathRoutes = pathSlugs.map((slug) => ({
    url: `${base}/paths/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const instructorRoutes = instructorSlugs.map((slug) => ({
    url: `${base}/instructors/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...courseRoutes,
    ...pathRoutes,
    ...instructorRoutes,
  ];
}
