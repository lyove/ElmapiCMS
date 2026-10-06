"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { NavCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "docs-sidebar-categories";

type DocsSidebarProps = {
  siteName: string;
  nav: NavCategory[];
  versionSlug: string;
  onNavigate?: () => void;
  className?: string;
};

function readStored(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") next[key] = value;
    }
    return next;
  } catch {
    return {};
  }
}

function writeStored(map: Record<string, boolean>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function DocsSidebar({
  siteName,
  nav,
  versionSlug,
  onNavigate,
  className,
}: DocsSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const category of nav) {
      initial[category.uuid] = category.defaultOpen;
    }
    return initial;
  });

  useEffect(() => {
    const stored = readStored();
    setOpen((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const category of nav) {
        if (typeof stored[category.uuid] === "boolean") {
          next[category.uuid] = stored[category.uuid];
        } else if (typeof next[category.uuid] !== "boolean") {
          next[category.uuid] = category.defaultOpen;
        }
      }
      return next;
    });
  }, [nav]);

  // Open the category that owns the current article/category route
  // (search, deep links, and in-sidebar article clicks).
  useEffect(() => {
    for (const category of nav) {
      const articleActive = category.articles.some(
        (article) => pathname === `/v/${versionSlug}/${article.slug}`,
      );
      const categoryActive =
        pathname === `/v/${versionSlug}/category/${category.slug}`;
      if (!articleActive && !categoryActive) continue;

      setOpen((prev) => {
        if (prev[category.uuid] === true) return prev;
        const next = { ...prev, [category.uuid]: true };
        writeStored({ ...readStored(), [category.uuid]: true });
        return next;
      });
    }
  }, [nav, pathname, versionSlug]);

  function setCategoryOpen(uuid: string, value: boolean) {
    setOpen((prev) => {
      const next = { ...prev, [uuid]: value };
      writeStored({ ...readStored(), [uuid]: value });
      return next;
    });
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <Link
        href={`/v/${versionSlug}`}
        onClick={onNavigate}
        className="block text-[15px] font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
      >
        {siteName}
      </Link>

      <nav aria-label="Documentation" className="space-y-5">
        {nav.map((category) => {
          const isOpen = open[category.uuid] ?? category.defaultOpen;
          const categoryActive =
            pathname === `/v/${versionSlug}/category/${category.slug}`;

          return (
            <div key={category.uuid}>
              <div className="mb-1 flex items-center gap-0.5">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${category.title}`}
                  onClick={() => setCategoryOpen(category.uuid, !isOpen)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 transition-transform duration-150",
                      isOpen && "rotate-90",
                    )}
                  />
                </button>
                <Link
                  href={`/v/${versionSlug}/category/${category.slug}`}
                  onClick={() => {
                    setCategoryOpen(category.uuid, true);
                    onNavigate?.();
                  }}
                  className={cn(
                    "min-w-0 flex-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground",
                    categoryActive && "bg-accent text-foreground",
                  )}
                >
                  {category.title}
                </Link>
              </div>
              {isOpen ? (
                <ul className="ms-3 space-y-0.5 border-s border-border/80 ps-2">
                  {category.articles.map((article) => {
                    const href = `/v/${versionSlug}/${article.slug}`;
                    const active = pathname === href;
                    return (
                      <li key={article.uuid}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          className={cn(
                            "block rounded-lg px-2.5 py-[0.4rem] text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                            active &&
                              "bg-docs-primary/10 font-medium text-docs-primary hover:bg-docs-primary/10 hover:text-docs-primary",
                          )}
                        >
                          {article.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
