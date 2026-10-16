import type { MetadataRoute } from "next";
import {
  getArticles,
  getCategories,
  getSiteSettings,
  getVersions,
} from "@/lib/content";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const settings = await getSiteSettings();
    base = siteUrl(settings);
  } catch {
    // keep fallback
  }
  const origin = base.replace(/\/$/, "");

  const entries: MetadataRoute.Sitemap = [
    {
      url: origin,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  try {
    const [versions, categories, articles] = await Promise.all([
      getVersions(),
      getCategories(),
      getArticles(),
    ]);

    for (const version of versions) {
      if (!version.fields.slug) continue;
      entries.push({
        url: `${origin}/v/${version.fields.slug}`,
        changeFrequency: "weekly",
        priority: 0.9,
      });

      for (const category of categories) {
        if (!category.fields.slug) continue;
        entries.push({
          url: `${origin}/v/${version.fields.slug}/category/${category.fields.slug}`,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }

    for (const article of articles) {
      const versionSlug = article.fields.version?.fields.slug;
      const slug = article.fields.slug;
      if (!versionSlug || !slug) continue;
      entries.push({
        url: `${origin}/v/${versionSlug}/${slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
        lastModified: article.published_at || undefined,
      });
    }
  } catch {
    // Return home-only sitemap if CMS is unavailable.
  }

  return entries;
}
