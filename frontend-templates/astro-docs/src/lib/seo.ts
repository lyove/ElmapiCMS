import { PUBLIC_SITE_URL } from 'astro:env/client';
import { assetUrl } from './assets';
import type { ContentEntry, SiteSettingsFields } from './types';

export type SeoMeta = {
  title: string;
  description?: string;
  canonical: string;
  image?: string;
};

export function siteUrl(settings?: ContentEntry<SiteSettingsFields> | null) {
  return (
    settings?.fields['site-url']?.replace(/\/$/, '') ||
    PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:4321'
  );
}

export function formatTitle(settings: ContentEntry<SiteSettingsFields>, pageTitle?: string): string {
  const siteName = settings.fields['site-name'] || 'Docs';
  if (!pageTitle) return settings.fields['seo-title'] || siteName;
  return `${pageTitle} | ${siteName}`;
}

export function buildPageSeo(options: {
  settings: ContentEntry<SiteSettingsFields>;
  title?: string;
  description?: string;
  path?: string;
  imageUrl?: string | null;
}): SeoMeta {
  const { settings, title, description, path = '', imageUrl } = options;
  const base = siteUrl(settings);
  const normalized = path === '/' ? '' : path;
  const canonical = `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  const defaultDescription = settings.fields['seo-description'];
  const defaultOg = assetUrl(settings.fields['og-image']);
  const ogImage = imageUrl || defaultOg || undefined;
  const metaTitle = formatTitle(settings, title);
  const metaDescription = description || defaultDescription || settings.fields.tagline || undefined;
  return {
    title: metaTitle,
    description: metaDescription,
    canonical,
    image: ogImage,
  };
}
