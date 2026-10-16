"use client";

import { useEffect, useState } from "react";
import { DocsHeader } from "@/components/docs-header";
import { DocsSidebar } from "@/components/docs-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ContentEntry,
  DocVersionFields,
  NavCategory,
  SearchItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const FULL_WIDTH_KEY = "docs-full-width";

/** Default page chrome width. */
const LAYOUT_WIDTH = "97rem";
const SIDEBAR_WIDTH = "268px";

type DocsShellProps = {
  siteName: string;
  versionSlug: string;
  versions: ContentEntry<DocVersionFields>[];
  nav: NavCategory[];
  searchItems: SearchItem[];
  children: React.ReactNode;
};

export function DocsShell({
  siteName,
  versionSlug,
  versions,
  nav,
  searchItems,
  children,
}: DocsShellProps) {
  const [fullWidth, setFullWidth] = useState(false);

  useEffect(() => {
    const storedWidth = window.localStorage.getItem(FULL_WIDTH_KEY);
    if (storedWidth === "1") setFullWidth(true);
  }, []);

  function onToggleFullWidth() {
    setFullWidth((prev) => {
      const next = !prev;
      window.localStorage.setItem(FULL_WIDTH_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="relative min-h-full bg-background">
      {/* Continue sidebar surface into the left viewport gutter when chrome is centered. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-0 z-0 hidden bg-docs-sidebar lg:block"
        style={{
          width: fullWidth
            ? SIDEBAR_WIDTH
            : `max(${SIDEBAR_WIDTH}, calc((100vw - min(100vw, ${LAYOUT_WIDTH})) / 2 + ${SIDEBAR_WIDTH}))`,
        }}
      />

      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-full w-full transition-[max-width] duration-200",
          fullWidth ? "max-w-none" : "max-w-[97rem]",
        )}
      >
        <aside className="sticky top-0 hidden h-svh w-[268px] shrink-0 border-r border-border/80 bg-transparent lg:block">
          <ScrollArea className="h-full">
            <div className="px-4 py-5">
              <DocsSidebar
                siteName={siteName}
                nav={nav}
                versionSlug={versionSlug}
              />
            </div>
          </ScrollArea>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <DocsHeader
            siteName={siteName}
            versionSlug={versionSlug}
            versions={versions}
            nav={nav}
            searchItems={searchItems}
            fullWidth={fullWidth}
            onToggleFullWidth={onToggleFullWidth}
          />
          <main className="min-w-0 flex-1 px-4 py-10 sm:px-6 md:px-8 lg:px-10 lg:py-12">
            <div className="mx-auto w-full max-w-[860px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
