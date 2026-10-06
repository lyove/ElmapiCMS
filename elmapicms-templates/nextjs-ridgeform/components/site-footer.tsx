import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter-form";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

type SiteFooterProps = {
  settings: ContentEntry<SiteSettingsFields>;
};

export function SiteFooter({ settings }: SiteFooterProps) {
  const name = settings.fields["company-name"] || "Ridgeform";
  const nav = settings.fields.navigation ?? [];
  const address = settings.fields.address?.split("\n") ?? [];

  return (
    <footer className="bg-ink text-white">
      <div className="border-b border-white/10 bg-[#1a1a1a]">
        <div className="site-shell py-12 md:max-w-xl">
          <NewsletterForm
            title={settings.fields["newsletter-title"]}
            description={
              settings.fields["footer-tagline"] ||
              "Project updates, site tips, and Front Range build notes from Ridgeform."
            }
          />
        </div>
      </div>

      <div className="site-shell grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-heading text-2xl font-extrabold uppercase">{name}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
            {settings.fields.tagline}
          </p>
          <div className="mt-6 space-y-3 text-sm text-white/75">
            {address.length > 0 ? (
              <p className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-safety" />
                <span>{address.join(", ")}</span>
              </p>
            ) : null}
            {settings.fields.email ? (
              <p className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-safety" />
                <a href={`mailto:${settings.fields.email}`}>{settings.fields.email}</a>
              </p>
            ) : null}
            {settings.fields.phone ? (
              <p className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-safety" />
                <a href={`tel:${settings.fields.phone.replace(/\D/g, "")}`}>
                  {settings.fields.phone}
                </a>
              </p>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-3">
          <h3 className="font-heading text-lg font-bold">Useful links</h3>
          <ul className="mt-4 space-y-2">
            {nav.map((item) =>
              item.url && item.label ? (
                <li key={`f-${item.label}`}>
                  <Link
                    href={item.url}
                    className="text-sm text-white/70 transition-colors hover:text-safety"
                  >
                    {item.label}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </div>

        <div className="md:col-span-4">
          <h3 className="font-heading text-lg font-bold">Contact Us</h3>
          <p className="mt-4 text-sm text-white/70">
            Service area: {settings.fields["service-area"] || "Colorado Front Range"}
          </p>
          {settings.fields["license-number"] ? (
            <p className="mt-2 text-xs uppercase tracking-wider text-white/45">
              License {settings.fields["license-number"]}
            </p>
          ) : null}
          <Link href="/contact" className="btn-cta btn-cta-brand mt-6">
            Contact Us
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="site-shell flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <p>{settings.fields["years-label"]}</p>
        </div>
      </div>
    </footer>
  );
}
