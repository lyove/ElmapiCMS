import Link from "next/link";
import { NorthlineMark } from "@/components/mark";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

export function SiteFooter({
  settings,
}: {
  settings: ContentEntry<SiteSettingsFields>;
}) {
  const siteName = settings.fields["site-name"] || "Northline Academy";
  const nav = settings.fields["nav-links"] ?? [];

  return (
    <footer className="relative z-10 mt-24 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <NorthlineMark className="bg-white text-ink" />
            <span className="font-heading text-xl font-semibold">{siteName}</span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/60">
            {settings.fields["footer-tagline"] ||
              "Learn with intention. Practice with structure."}
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap gap-4 md:justify-end">
            {nav.map((item) =>
              item.label && item.url ? (
                <Link
                  key={`${item.label}-${item.url}`}
                  href={item.url}
                  className="text-sm font-semibold text-white/70 hover:text-white"
                >
                  {item.label}
                </Link>
              ) : null,
            )}
          </div>
          {settings.fields["contact-email"] ? (
            <a
              href={`mailto:${settings.fields["contact-email"]}`}
              className="text-sm text-white/60 hover:text-white"
            >
              {settings.fields["contact-email"]}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
