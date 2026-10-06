import Link from "next/link";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

type SiteFooterProps = {
  settings: ContentEntry<SiteSettingsFields>;
};

export function SiteFooter({ settings }: SiteFooterProps) {
  const social = settings.fields["social-links"] ?? [];
  const nav = settings.fields.navigation ?? [];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/40 bg-card/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="font-heading text-xl font-semibold">{settings.fields["site-name"]}</p>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {settings.fields["footer-tagline"] || settings.fields.tagline}
          </p>
        </div>
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Explore
          </p>
          <ul className="space-y-2">
            {nav.map((item) =>
              item.url ? (
                <li key={item.url}>
                  <Link
                    href={item.url}
                    className="text-sm text-foreground/80 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </div>
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Contact
          </p>
          {settings.fields["contact-email"] ? (
            <a
              href={`mailto:${settings.fields["contact-email"]}`}
              className="block text-sm hover:text-primary"
            >
              {settings.fields["contact-email"]}
            </a>
          ) : null}
          {settings.fields["contact-phone"] ? (
            <p className="text-sm text-muted-foreground">{settings.fields["contact-phone"]}</p>
          ) : null}
          {settings.fields.address ? (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
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
      <div className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {year} {settings.fields["site-name"]}. All rights reserved.
      </div>
    </footer>
  );
}
