import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { firstAsset } from "./assets";
import type { ContentEntry, SiteSettingsFields } from "./types";

type PageSeoInput = {
  settings: ContentEntry<SiteSettingsFields>;
  locale: Locale;
  title?: string;
  description?: string;
  /** Path without locale prefix, e.g. "" for home, "/about", "/blog/my-post". */
  path?: string;
  imageUrl?: string | null;
};

export function siteUrl(settings: ContentEntry<SiteSettingsFields>): string {
  return (
    settings.fields["site-url"]?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function formatTitle(
  settings: ContentEntry<SiteSettingsFields>,
  pageTitle?: string,
): string {
  const siteName = settings.fields["site-name"] || "Atlas Group";
  if (!pageTitle) return siteName;
  const template = settings.fields["seo-title-template"] || "%s";
  if (template.includes("%s")) return template.replace("%s", pageTitle);
  return `${pageTitle} | ${siteName}`;
}

/** Build a localized path, e.g. localePath("en", "/about") -> "/en/about". */
export function localePath(locale: Locale, path = ""): string {
  const normalized = path === "" || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized}`;
}

export function buildMetadata({
  settings,
  locale,
  title,
  description,
  path = "",
  imageUrl,
}: PageSeoInput): Metadata {
  const base = siteUrl(settings);
  const canonicalPath = localePath(locale, path);
  const canonical = `${base}${canonicalPath}`;
  const defaultDescription = settings.fields["default-meta-description"];
  const defaultOg = firstAsset(settings.fields["default-og-image"]);
  const ogImage = imageUrl || defaultOg?.url || `${base}${localePath(locale, "/opengraph-image")}`;

  const metaTitle = formatTitle(settings, title);
  const metaDescription = description || defaultDescription || settings.fields.tagline;

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${base}${localePath(loc, path)}`;
  }
  languages["x-default"] = `${base}${localePath(locales[0], path)}`;

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      url: canonical,
      title: metaTitle,
      description: metaDescription ?? undefined,
      siteName: settings.fields["site-name"] ?? undefined,
      locale,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription ?? undefined,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}
