import type { MetadataRoute } from "next";
import { getProjects, getServices, getSiteSettings } from "@/lib/content";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, services, projects] = await Promise.all([
    getSiteSettings(),
    getServices(),
    getProjects(),
  ]);
  const base = siteUrl(settings);

  const staticRoutes = ["", "/services", "/projects", "/process", "/about", "/contact"].map(
    (path) => ({
      url: `${base}${path || "/"}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  const serviceRoutes = services
    .filter((entry) => entry.fields.slug)
    .map((entry) => ({
      url: `${base}/services/${entry.fields.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  const projectRoutes = projects
    .filter((entry) => entry.fields.slug)
    .map((entry) => ({
      url: `${base}/projects/${entry.fields.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticRoutes, ...serviceRoutes, ...projectRoutes];
}
