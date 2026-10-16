import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
import { NorthlineMark } from "@/components/mark";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

export function SiteHeader({
  settings,
}: {
  settings: ContentEntry<SiteSettingsFields>;
}) {
  const siteName = settings.fields["site-name"] || "Northline Academy";
  const nav = settings.fields["nav-links"] ?? [];
  const memberLabel = settings.fields["member-cta-label"] || "Member login";
  const memberUrl = settings.fields["member-cta-url"] || "/login";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:gap-8 sm:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <NorthlineMark className="shrink-0 transition-transform duration-300 group-hover:-rotate-3" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-heading text-lg font-semibold tracking-tight sm:text-xl">
              {siteName}
            </div>
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">
              Learning membership
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {nav.map((item) =>
            item.label && item.url ? (
              <Link
                key={`${item.label}-${item.url}`}
                href={item.url}
                className="text-sm font-semibold text-foreground/70 transition-colors hover:text-coral"
              >
                {item.label}
              </Link>
            ) : null,
          )}
        </nav>

        <AuthNav
          siteName={siteName}
          nav={nav}
          memberLabel={memberLabel}
          memberUrl={memberUrl}
        />
      </div>
    </header>
  );
}
