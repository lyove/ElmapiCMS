"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { SearchItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type DocsSearchProps = {
  items: SearchItem[];
  versionSlug: string;
  className?: string;
  onNavigate?: () => void;
};

export function DocsSearch({
  items,
  versionSlug,
  className,
  onNavigate,
}: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const results = useMemo(() => {
    if (!deferred) return [];
    return items
      .filter((item) => {
        const haystack =
          `${item.title} ${item.summary} ${item.categoryTitle}`.toLowerCase();
        return haystack.includes(deferred);
      })
      .slice(0, 8);
  }, [deferred, items]);

  return (
    <div className={cn("relative", className)}>
      <label className="sr-only" htmlFor="docs-search">
        Search documentation
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="docs-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search…"
          className="h-8 bg-background pl-8 text-sm"
          autoComplete="off"
        />
      </div>
      {deferred ? (
        <div className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-40 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              No matches for “{query.trim()}”.
            </p>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {results.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/v/${versionSlug}/${item.slug}`}
                    onClick={() => {
                      setQuery("");
                      onNavigate?.();
                    }}
                    className="block px-3 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.categoryTitle}
                      {item.summary ? ` · ${item.summary}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
