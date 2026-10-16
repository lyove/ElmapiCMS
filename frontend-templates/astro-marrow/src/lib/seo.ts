import { PUBLIC_SITE_URL } from 'astro:env/client';
import { getMediaUrl } from './assets';
import type { ContentEntry, PageSeoFields, SiteSettingsFields } from './types';

export type SeoMeta = {
  title: string;
  description?: string;
  canonical: string;
  image?: string;
};

export function siteUrl(settings: ContentEntry<SiteSettingsFields> | null): string {
  return (
    settings?.fields['site-url']?.replace(/\/$/, '') ||
    PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:4321'
  );
}

export function formatTitle(
  settings: ContentEntry<SiteSettingsFields> | null,
  pageTitle?: string,
): string {
  const siteName = settings?.fields['site-name'] || 'Marrow';
  if (!pageTitle) return settings?.fields['seo-title'] || siteName;
  return `${pageTitle} | ${siteName}`;
}

export function buildSeo({
  settings,
  page,
  path = '',
  fallbackTitle,
  fallbackDescription,
}: {
  settings: ContentEntry<SiteSettingsFields> | null;
  page?: PageSeoFields | null;
  path?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}): SeoMeta {
  const base = siteUrl(settings);
  const normalizedPath = path === '' || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  const canonical = `${base}${normalizedPath || '/'}`;

  const pageTitle = page?.['seo-title'] || fallbackTitle;
  const title = formatTitle(settings, pageTitle);
  const description =
    page?.['seo-description'] ||
    fallbackDescription ||
    settings?.fields['seo-description'] ||
    settings?.fields.tagline;

  const pageImage = getMediaUrl(page?.['seo-image']);
  const defaultImage = getMediaUrl(settings?.fields['og-image']);
  const image = pageImage || defaultImage || undefined;

  return { title, description, canonical, image };
}

export function pageSeoFromFields(fields: PageSeoFields): Pick<SeoMeta, 'title' | 'description' | 'image'> {
  return {
    title: fields['seo-title'] || '',
    description: fields['seo-description'],
    image: getMediaUrl(fields['seo-image']) || undefined,
  };
}
