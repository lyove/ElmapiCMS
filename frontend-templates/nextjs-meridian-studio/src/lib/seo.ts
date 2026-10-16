import type { Metadata } from "next";
import { firstAsset } from "./assets";
import type { ContentEntry, SiteSettingsFields } from "./types";

type PageSeoInput = {
  settings: ContentEntry<SiteSettingsFields>;
  title?: string;
  description?: string;
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
  const siteName = settings.fields["site-name"] || "Studio";
  if (!pageTitle) return siteName;
  const template = settings.fields["seo-title-template"] || "%s";
  if (template.includes("%s")) return template.replace("%s", pageTitle);
  return `${pageTitle} | ${siteName}`;
}

export function buildMetadata({
  settings,
  title,
  description,
  path = "",
  imageUrl,
}: PageSeoInput): Metadata {
  const base = siteUrl(settings);
  const canonical = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const defaultDescription = settings.fields["default-meta-description"];
  const defaultOg = firstAsset(settings.fields["default-og-image"]);
  const ogImage = imageUrl || defaultOg?.url || `${base}/opengraph-image`;

  const metaTitle = formatTitle(settings, title);
  const metaDescription = description || defaultDescription || settings.fields.tagline;

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: metaTitle,
      description: metaDescription ?? undefined,
      siteName: settings.fields["site-name"] ?? undefined,
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
