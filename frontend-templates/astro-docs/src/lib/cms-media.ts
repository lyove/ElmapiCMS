import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/** Origin that serves `/uploads/...` (API base is usually `https://host/api`). */
export function cmsOriginFromApiBase(baseUrl: string | undefined | null): string | null {
  const raw = baseUrl?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** Turn CMS-relative media paths into absolute URLs for the docs frontend. */
export function absolutizeCmsMediaUrl(src: string, origin: string): string {
  const value = src.trim();
  if (!value) return src;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return src;
  if (value.startsWith('/uploads/')) return `${origin}${value}`;
  return src;
}

/** Rewrite `/uploads/...` in HTML strings (full-HTML body fallback). */
export function rewriteCmsMediaUrlsInHtml(html: string, origin: string): string {
  return html.replace(
    /(\s(?:src|href)=["'])(\/uploads\/[^"']+)(["'])/gi,
    (_match, prefix: string, path: string, suffix: string) => `${prefix}${origin}${path}${suffix}`,
  );
}

/** rehype: absolutize relative `/uploads/` image srcs. */
export function rehypeAbsolutizeCmsMedia(origin: string | null): Plugin<[], Root> {
  return () => (tree: Root) => {
    if (!origin) return;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;
      const src = node.properties?.src;
      if (typeof src !== 'string') return;
      node.properties = {
        ...node.properties,
        src: absolutizeCmsMediaUrl(src, origin),
      };
    });
  };
}
