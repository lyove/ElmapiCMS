import Link from "next/link";
import { RichText } from "@/components/rich-text";
import type { ContentEntry, PageFields } from "@/lib/types";

const LEGAL_NAV = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Shipping", href: "/shipping" },
];

export function PolicyPage({
  page,
  eyebrow = "Legal",
}: {
  page: ContentEntry<PageFields>;
  eyebrow?: string;
}) {
  const currentSlug = page.fields.slug;

  return (
    <div>
      <section className="border-b border-border bg-mist">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-16">
          <p className="eyebrow animate-rise">{eyebrow}</p>
          <h1 className="section-title mt-3 animate-rise animate-rise-delay-1">
            {page.fields.title}
          </h1>
          {page.fields.summary ? (
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-stone animate-rise animate-rise-delay-2">
              {page.fields.summary}
            </p>
          ) : null}
          <nav
            aria-label="Legal pages"
            className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-[11px] font-semibold uppercase tracking-[0.14em]"
          >
            {LEGAL_NAV.map((item) => {
              const active = item.href === `/${currentSlug}`;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "text-teal"
                      : "text-stone transition-colors hover:text-ink"
                  }
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-16">
        <RichText value={page.fields.body} />
      </article>
    </div>
  );
}
