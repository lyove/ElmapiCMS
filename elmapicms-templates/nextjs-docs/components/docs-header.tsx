"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { DocsSearch } from "@/components/docs-search";
import { DocsSidebar } from "@/components/docs-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { VersionSwitcher } from "@/components/version-switcher";
import { WidthToggle } from "@/components/width-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type {
  ContentEntry,
  DocVersionFields,
  NavCategory,
  SearchItem,
} from "@/lib/types";

type DocsHeaderProps = {
  siteName: string;
  versionSlug: string;
  versions: ContentEntry<DocVersionFields>[];
  nav: NavCategory[];
  searchItems: SearchItem[];
  fullWidth: boolean;
  onToggleFullWidth: () => void;
};

export function DocsHeader({
  siteName,
  versionSlug,
  versions,
  nav,
  searchItems,
  fullWidth,
  onToggleFullWidth,
}: DocsHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/70">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:px-5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                aria-label="Open navigation"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(20rem,90vw)] bg-docs-sidebar p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{siteName}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-4 py-5">
              <DocsSidebar
                siteName={siteName}
                nav={nav}
                versionSlug={versionSlug}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <VersionSwitcher versions={versions} currentSlug={versionSlug} />

        <div className="ml-auto flex items-center gap-1.5">
          <DocsSearch
            items={searchItems}
            versionSlug={versionSlug}
            className="w-44 sm:w-56 md:w-64"
          />
          <WidthToggle
            fullWidth={fullWidth}
            onToggle={onToggleFullWidth}
          />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
