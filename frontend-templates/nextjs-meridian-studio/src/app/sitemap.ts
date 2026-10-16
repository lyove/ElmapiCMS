import type { MetadataRoute } from "next";
import {
  getCaseStudySlugs,
  getInsightSlugs,
  getSiteSettings,
} from "@/lib/content";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, caseSlugs, insightSlugs] = await Promise.all([
    getSiteSettings(),
    getCaseStudySlugs(),
    getInsightSlugs(),
  ]);

  const base = siteUrl(settings);
  const now = new Date();

  const staticRoutes = ["", "/work", "/services", "/team", "/insights", "/contact"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    }),
  );

  const workRoutes = caseSlugs.map((slug) => ({
    url: `${base}/work/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const insightRoutes = insightSlugs.map((slug) => ({
    url: `${base}/insights/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...workRoutes, ...insightRoutes];
}
