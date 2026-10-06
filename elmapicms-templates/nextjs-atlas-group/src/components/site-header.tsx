import Link from "next/link";
import { Compass } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteNav } from "@/components/site-nav";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/lib/seo";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

type SiteHeaderProps = {
  settings: ContentEntry<SiteSettingsFields>;
  locale: Locale;
  dictionary: Dictionary;
};

export function SiteHeader({ settings, locale, dictionary }: SiteHeaderProps) {
  const nav = settings.fields["nav-links"] ?? [];

  return (
    <header className="relative sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-6">
        <Link
          href={localePath(locale)}
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
        >
          <Compass className="size-5 text-accent" strokeWidth={2.25} aria-hidden="true" />
          {settings.fields["site-name"]}
        </Link>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          {dictionary.common.skipToContent}
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <SiteNav
            nav={nav}
            locale={locale}
            openMenuLabel={dictionary.common.openMenu}
            closeMenuLabel={dictionary.common.closeMenu}
          />
          <LocaleSwitcher locale={locale} label={dictionary.common.changeLanguage} />
        </div>
      </div>
    </header>
  );
}
