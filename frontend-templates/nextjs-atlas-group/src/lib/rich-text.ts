import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/** True when the value already looks like HTML from the Content API. */
function looksLikeHtml(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("<") && /<\/[a-z][a-z0-9]*>/i.test(trimmed);
}

/**
 * Normalize Elmapi richtext for HTML rendering. Markdown-mode fields with
 * outputFormat html return HTML directly; some setups may still return a
 * markdown string, so we parse it client-side as a fallback.
 */
export function richTextToHtml(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return trimmed;
  return marked.parse(trimmed, { async: false }) as string;
}
