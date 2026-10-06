import type { MetadataRoute } from "next";
import { defaultLocale, locales } from "@/i18n/config";
import {
  getBlogPostSlugs,
  getCaseStudySlugs,
  getLocationSlugs,
  getServiceSlugs,
  getSiteSettings,
} from "@/lib/content";
import { localePath, siteUrl } from "@/lib/seo";

const STATIC_PATHS = ["", "/about", "/services", "/work", "/locations", "/blog", "/contact"];

function languageAlternates(base: string, path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = `${base}${localePath(locale, path)}`;
  }
  languages["x-default"] = `${base}${localePath(defaultLocale, path)}`;
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, serviceSlugs, caseStudySlugs, locationSlugs, blogSlugs] =
    await Promise.all([
      getSiteSettings(defaultLocale),
      getServiceSlugs(),
      getCaseStudySlugs(),
      getLocationSlugs(),
      getBlogPostSlugs(),
    ]);

  const base = siteUrl(settings);
  const now = new Date();

  const dynamicPaths = [
    ...serviceSlugs.map((slug) => `/services/${slug}`),
    ...caseStudySlugs.map((slug) => `/work/${slug}`),
    ...locationSlugs.map((slug) => `/locations/${slug}`),
    ...blogSlugs.map((slug) => `/blog/${slug}`),
  ];

  const allPaths = [...STATIC_PATHS, ...dynamicPaths];

  return locales.flatMap((locale) =>
    allPaths.map((path) => ({
      url: `${base}${localePath(locale, path)}`,
      lastModified: now,
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
      alternates: { languages: languageAlternates(base, path) },
    })),
  );
}
