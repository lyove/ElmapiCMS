import type { APIRoute } from 'astro';
import { getJournalPosts, getSiteSettings } from '../lib/content';
import { siteUrl } from '../lib/seo';

function urlEntry(loc: string, lastmod?: string | null): string {
  const last = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${last}\n  </url>`;
}

export const GET: APIRoute = async () => {
  const settings = await getSiteSettings();
  const base = siteUrl(settings);

  const posts = await getJournalPosts().catch(() => []);

  const staticPaths = [
    '',
    '/menu',
    '/about',
    '/gallery',
    '/private-dining',
    '/visit',
    '/journal',
    '/reserve',
  ];

  const urls = [
    ...staticPaths.map((path) => urlEntry(`${base}${path || '/'}`)),
    ...posts.map((post) =>
      urlEntry(`${base}/journal/${post.fields.slug}`, post.published_at),
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
