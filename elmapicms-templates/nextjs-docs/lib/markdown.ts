import type { TocItem } from "./types";

/** Prefer markdown source; if API still returns HTML, leave it for the renderer fallback. */
export function normalizeMarkdown(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Drop a leading H1 so the page title owns the heading.
  return trimmed.replace(/^#\s+.+\n+/, "");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~[\]]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Extract h2/h3 headings from markdown for the TOC. */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const seen = new Map<string, number>();

  for (const line of markdown.split("\n")) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const depth = match[1].length;
    const title = match[2].replace(/#+\s*$/, "").trim();
    if (!title) continue;

    let id = slugify(title);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;

    items.push({ id, title, depth });
  }

  return items;
}
