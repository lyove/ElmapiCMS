"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassMark } from "@/components/compass-mark";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localePath } from "@/lib/seo";

/**
 * Locale-aware 404. not-found.tsx never receives route params, so locale is
 * read from the pathname. Must not call headers()/cookies() here; that would
 * force every [locale] route into dynamic rendering and break ISR.
 */
export default function NotFound() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0];
  const locale = segment && isLocale(segment) ? segment : defaultLocale;
  const dictionary = getDictionary(locale);

  return (
    <div className="grid-field relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 py-24 text-center">
      <CompassMark className="pointer-events-none absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 text-primary/10" />
      <div className="relative">
        <p className="coord-label mb-4">404</p>
        <h1 className="font-heading text-4xl font-semibold md:text-5xl">
          {dictionary.notFound.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">{dictionary.notFound.body}</p>
        <Link
          href={localePath(locale)}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {dictionary.notFound.cta}
        </Link>
      </div>
    </div>
  );
}
