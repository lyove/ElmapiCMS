import type { Metadata } from "next";
import { firstAsset } from "./assets";
import type { ContentEntry, SiteSettingsFields } from "./types";

type PageSeoInput = {
  settings: ContentEntry<SiteSettingsFields>;
  title?: string;
  description?: string;
  path?: string;
  imageUrl?: string | null;
  robots?: Metadata["robots"];
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
  const siteName = settings.fields["site-name"] || "Docs";
  if (!pageTitle) {
    return settings.fields["seo-title"] || siteName;
  }
  return `${pageTitle} | ${siteName}`;
}

export function buildMetadata({
  settings,
  title,
  description,
  path = "",
  imageUrl,
  robots,
}: PageSeoInput): Metadata {
  const base = siteUrl(settings);
  const normalized = path === "/" ? "" : path;
  const canonical = `${base}${normalized}`;
  const defaultDescription = settings.fields["seo-description"];
  const defaultOg = firstAsset(settings.fields["og-image"]);
  const ogImage = imageUrl || defaultOg?.url || `${base}/opengraph-image`;

  const metaTitle = formatTitle(settings, title);
  const metaDescription =
    description || defaultDescription || settings.fields.tagline;

  return {
    metadataBase: new URL(base),
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical },
    robots,
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
  };
}
