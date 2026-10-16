import type { APIRoute } from 'astro';
import {
  getArticles,
  getCategories,
  getSiteSettings,
  getVersions,
} from '../lib/content';
import { siteUrl } from '../lib/seo';

function urlEntry(loc: string, lastmod?: string | null): string {
  const last = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${last}\n  </url>`;
}

export const GET: APIRoute = async () => {
  let base = siteUrl();

  try {
    const settings = await getSiteSettings();
    base = siteUrl(settings);
  } catch {
    // keep fallback
  }

  const origin = base.replace(/\/$/, '');
  const urls: string[] = [urlEntry(origin)];

  try {
    const [versions, categories, articles] = await Promise.all([
      getVersions(),
      getCategories(),
      getArticles(),
    ]);

    for (const version of versions) {
      if (!version.fields.slug) continue;
      urls.push(urlEntry(`${origin}/v/${version.fields.slug}`));

      for (const category of categories) {
        if (!category.fields.slug) continue;
        urls.push(
          urlEntry(`${origin}/v/${version.fields.slug}/category/${category.fields.slug}`),
        );
      }
    }

    for (const article of articles) {
      const versionSlug = article.fields.version?.fields.slug;
      const slug = article.fields.slug;
      if (!versionSlug || !slug) continue;
      urls.push(urlEntry(`${origin}/v/${versionSlug}/${slug}`, article.published_at));
    }
  } catch {
    // Return home-only sitemap if CMS is unavailable.
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
