import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

function looksLikeHtml(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('<') && /<\/[a-z][a-z0-9]*>/i.test(trimmed);
}

/**
 * Normalize Elmapi richtext for HTML rendering. Markdown-mode fields with
 * outputFormat html return HTML directly; some setups may still return a
 * markdown string, so we parse it as a fallback.
 */
export function renderRichText(value: unknown): string {
  if (value == null) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (looksLikeHtml(trimmed)) return trimmed;
    return marked.parse(trimmed, { async: false }) as string;
  }

  if (typeof value === 'object' && value !== null && 'html' in value) {
    const html = (value as { html?: unknown }).html;
    if (typeof html === 'string') return html;
  }

  return '';
}
