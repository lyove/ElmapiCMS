import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

type SiteHeaderProps = {
  settings: ContentEntry<SiteSettingsFields>;
};

export function SiteHeader({ settings }: SiteHeaderProps) {
  const nav = settings.fields.navigation ?? [];

  return (
    <header className="relative sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-6">
        <Link
          href="/"
          className="min-w-0 truncate font-heading text-lg font-semibold tracking-tight"
        >
          {settings.fields["site-name"]}
        </Link>
        <div className="flex items-center gap-3">
          <SiteNav nav={nav} />
          <Link
            href="/contact"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 md:inline-flex"
          >
            Start a project
          </Link>
        </div>
      </div>
    </header>
  );
}
