import { NotFoundError } from '@elmapicms/js-sdk';
import { cachedCms } from './cms-cache';
import { elmapi } from './elmapi';
import type {
  ContentEntry,
  FaqFields,
  GalleryImageFields,
  HomePageFields,
  JournalPostFields,
  MenuCategoryFields,
  MenuItemFields,
  PageAboutFields,
  PageGalleryFields,
  PageJournalFields,
  PageMenuFields,
  PagePrivateDiningFields,
  PageReserveFields,
  PageVisitFields,
  SiteSettingsFields,
} from './types';

export function asList<T>(response: T[] | { data: T[] } | unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T[] }).data;
  }
  return [];
}

function bySortOrder<T extends { fields: { 'sort-order'?: string | number } }>(a: T, b: T): number {
  return Number(a.fields['sort-order'] ?? 0) - Number(b.fields['sort-order'] ?? 0);
}

export async function getSingleton<T>(slug: string): Promise<ContentEntry<T> | null> {
  return cachedCms(`singleton:${slug}`, async () => {
    try {
      const entry = await elmapi.content.list(slug, { state: 'published' });
      if (entry && typeof entry === 'object' && 'uuid' in entry) {
        return entry as ContentEntry<T>;
      }
      return null;
    } catch {
      return null;
    }
  });
}

export async function getSiteSettings(): Promise<ContentEntry<SiteSettingsFields> | null> {
  return getSingleton<SiteSettingsFields>('site-settings');
}

export async function getHomePage(): Promise<ContentEntry<HomePageFields> | null> {
  return getSingleton<HomePageFields>('page-home');
}

export async function getPageMenu(): Promise<ContentEntry<PageMenuFields> | null> {
  return getSingleton<PageMenuFields>('page-menu');
}

export async function getPageAbout(): Promise<ContentEntry<PageAboutFields> | null> {
  return getSingleton<PageAboutFields>('page-about');
}

export async function getPageGallery(): Promise<ContentEntry<PageGalleryFields> | null> {
  return getSingleton<PageGalleryFields>('page-gallery');
}

export async function getPagePrivateDining(): Promise<ContentEntry<PagePrivateDiningFields> | null> {
  return getSingleton<PagePrivateDiningFields>('page-private-dining');
}

export async function getPageVisit(): Promise<ContentEntry<PageVisitFields> | null> {
  return getSingleton<PageVisitFields>('page-visit');
}

export async function getPageJournal(): Promise<ContentEntry<PageJournalFields> | null> {
  return getSingleton<PageJournalFields>('page-journal');
}

export async function getPageReserve(): Promise<ContentEntry<PageReserveFields> | null> {
  return getSingleton<PageReserveFields>('page-reserve');
}

export async function getMenuCategories(): Promise<ContentEntry<MenuCategoryFields>[]> {
  return cachedCms('menu-categories', async () => {
    const res = await elmapi.content.list('menu-categories', {
      state: 'published',
      sort: 'sort-order:asc',
    });
    return asList<ContentEntry<MenuCategoryFields>>(res).sort(bySortOrder);
  });
}

export async function getMenuItems(): Promise<ContentEntry<MenuItemFields>[]> {
  return cachedCms('menu-items', async () => {
    const res = await elmapi.content.list('menu-items', {
      state: 'published',
      sort: 'sort-order:asc',
    });
    return asList<ContentEntry<MenuItemFields>>(res).sort(bySortOrder);
  });
}

export async function getGalleryImages(): Promise<ContentEntry<GalleryImageFields>[]> {
  return cachedCms('gallery-images', async () => {
    const res = await elmapi.content.list('gallery-images', {
      state: 'published',
      sort: 'sort-order:asc',
    });
    return asList<ContentEntry<GalleryImageFields>>(res).sort(bySortOrder);
  });
}

export async function getFaqs(): Promise<ContentEntry<FaqFields>[]> {
  return cachedCms('faqs', async () => {
    const res = await elmapi.content.list('faqs', {
      state: 'published',
      sort: 'sort-order:asc',
    });
    return asList<ContentEntry<FaqFields>>(res).sort(bySortOrder);
  });
}

export async function getJournalPosts(): Promise<ContentEntry<JournalPostFields>[]> {
  return cachedCms('journal-posts', async () => {
    const res = await elmapi.content.list('journal-posts', {
      state: 'published',
      sort: 'published_at:desc',
    });
    return asList<ContentEntry<JournalPostFields>>(res);
  });
}

export async function getJournalPostBySlug(slug: string): Promise<ContentEntry<JournalPostFields>> {
  return cachedCms(`journal-post:${slug}`, async () => {
    const res = await elmapi.content.list('journal-posts', {
      state: 'published',
      where: { slug: { eq: slug } },
      first: true,
    });
    const entry = res as ContentEntry<JournalPostFields>;
    if (!entry?.uuid) throw new NotFoundError('Journal post not found');
    return entry;
  });
}

export async function getJournalPostSlugs(): Promise<string[]> {
  const posts = await getJournalPosts();
  return posts.map((p) => p.fields.slug).filter(Boolean) as string[];
}

export function formatPrice(price: string | number | undefined | null): string {
  if (price == null || price === '') return '';
  const num = String(price).replace(/^\$/, '').trim();
  return `$${num}`;
}

export function parseDietary(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function groupMenuItemsByCategory(
  categories: ContentEntry<MenuCategoryFields>[],
  items: ContentEntry<MenuItemFields>[],
): Array<{
  category: ContentEntry<MenuCategoryFields>;
  items: ContentEntry<MenuItemFields>[];
}> {
  return categories.map((category) => ({
    category,
    items: items.filter((item) => item.fields.category?.uuid === category.uuid),
  }));
}
