import type { MetadataRoute } from "next";
import {
  getBlogPostSlugs,
  getProductSlugs,
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

  let productSlugs: string[] = [];
  let blogSlugs: string[] = [];
  try {
    [productSlugs, blogSlugs] = await Promise.all([
      getProductSlugs(),
      getBlogPostSlugs(),
    ]);
  } catch {
    productSlugs = [];
    blogSlugs = [];
  }

  const staticRoutes = [
    "",
    "/shop",
    "/blog",
    "/about",
    "/shipping",
    "/privacy",
    "/terms",
    "/faq",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const productRoutes = productSlugs.map((slug) => ({
    url: `${base}/shop/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const blogRoutes = blogSlugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...blogRoutes];
}
