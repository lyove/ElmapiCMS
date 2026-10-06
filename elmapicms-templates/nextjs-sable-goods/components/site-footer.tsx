import Link from "next/link";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

const PRODUCT_LINKS = [
  { label: "Shop all", href: "/shop" },
  { label: "Ceramics", href: "/shop?category=ceramics" },
  { label: "Bowls and platters", href: "/shop?category=bowls-platters" },
  { label: "Linen", href: "/shop?category=linen" },
  { label: "Table linen", href: "/shop?category=table-linen" },
  { label: "Lamps", href: "/shop?category=lamps" },
];

const USEFUL_LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Shipping", href: "/shipping" },
  { label: "FAQ", href: "/faq" },
  { label: "Account", href: "/account" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Shipping", href: "/shipping" },
];

export function SiteFooter({
  settings,
}: {
  settings: ContentEntry<SiteSettingsFields>;
}) {
  const siteName = settings.fields["site-name"] || "Sable Goods";

  return (
    <footer className="border-t border-border bg-mist">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-1">
          <p className="brand-mark text-lg tracking-[0.22em]">{siteName}</p>
          <p className="text-[13px] leading-6 text-stone">
            {settings.fields["footer-blurb"] || settings.fields.description}
          </p>
          {settings.fields["store-address"] ? (
            <p className="whitespace-pre-line text-[13px] leading-6 text-stone">
              {settings.fields["store-address"]}
            </p>
          ) : null}
          {settings.fields["contact-phone"] ? (
            <p className="text-[13px] text-ink">{settings.fields["contact-phone"]}</p>
          ) : null}
          {settings.fields["contact-email"] ? (
            <a
              href={`mailto:${settings.fields["contact-email"]}`}
              className="block text-[13px] text-ink hover:text-teal"
            >
              {settings.fields["contact-email"]}
            </a>
          ) : null}
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-ink">
            Our products
          </h3>
          <ul className="space-y-2.5">
            {PRODUCT_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[13px] text-stone hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-ink">
            Useful links
          </h3>
          <ul className="space-y-2.5">
            {USEFUL_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[13px] text-stone hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-ink">
            Store note
          </h3>
          <p className="text-[13px] leading-6 text-stone">
            {settings.fields["payment-note"] ||
              "Account checkout with invoice payment on fulfillment. No card payments on the site."}
          </p>
          {settings.fields["shipping-note"] ? (
            <p className="mt-3 text-[13px] leading-6 text-stone">
              {settings.fields["shipping-note"]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-[12px] text-stone sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <span className="hidden text-border sm:inline" aria-hidden>
              |
            </span>
            <span>Powered by ElmapiCMS</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
