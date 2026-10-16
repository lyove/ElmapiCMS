import type { MetadataRoute } from "next";
import { defaultLocale } from "@/i18n/config";
import { getSiteSettings } from "@/lib/content";
import { siteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings(defaultLocale);
  const base = siteUrl(settings);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
