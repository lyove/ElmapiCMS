import Link from "next/link";
import { Compass } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/lib/seo";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

type SiteFooterProps = {
  settings: ContentEntry<SiteSettingsFields>;
  locale: Locale;
  dictionary: Dictionary;
};

export function SiteFooter({ settings, locale, dictionary }: SiteFooterProps) {
  const social = settings.fields["social-links"] ?? [];
  const nav = settings.fields["nav-links"] ?? [];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="flex items-center gap-2 font-heading text-xl font-semibold">
            <Compass className="size-5 text-accent" strokeWidth={2.25} aria-hidden="true" />
            {settings.fields["site-name"]}
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {settings.fields["footer-tagline"] || settings.fields.tagline}
          </p>
        </div>
        <div>
          <p className="coord-label mb-4">{dictionary.common.exploreHeading}</p>
          <ul className="space-y-2">
            {nav.map((item) =>
              item.url ? (
                <li key={item.url}>
                  <Link
                    href={localePath(locale, item.url)}
                    className="text-sm text-foreground/80 hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </div>
        <div className="space-y-4">
          <p className="coord-label">{dictionary.contact.pageEyebrow}</p>
          {settings.fields["contact-email"] ? (
            <a
              href={`mailto:${settings.fields["contact-email"]}`}
              className="block text-sm hover:text-accent"
            >
              {settings.fields["contact-email"]}
            </a>
          ) : null}
          {settings.fields["contact-phone"] ? (
            <p className="text-sm text-muted-foreground">{settings.fields["contact-phone"]}</p>
          ) : null}
          {settings.fields.address ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {settings.fields.address}
            </p>
          ) : null}
          <ul className="flex flex-wrap gap-4 pt-2">
            {social.map((link) =>
              link.url ? (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.platform}
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        &copy; {year} {settings.fields["site-name"]}. {dictionary.common.allRightsReserved}
      </div>
    </footer>
  );
}
