import type { APIRoute } from 'astro';
import { getSiteSettings } from '../lib/content';
import { siteUrl } from '../lib/seo';

export const GET: APIRoute = async () => {
  const settings = await getSiteSettings().catch(() => null);
  const base = siteUrl(settings);

  const body = `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
