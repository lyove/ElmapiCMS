"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";

type LocaleSwitcherProps = {
  locale: Locale;
  label: string;
};

/** Swap the leading /xx locale segment, keep the rest of the path. */
function pathForLocale(pathname: string, target: Locale): string {
  const segments = pathname.split("/");
  segments[1] = target;
  return segments.join("/") || `/${target}`;
}

export function LocaleSwitcher({ locale, label }: LocaleSwitcherProps) {
  const pathname = usePathname() || `/${locale}`;

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {locales.map((code) => (
        <Link
          key={code}
          href={pathForLocale(pathname, code)}
          className={
            code === locale
              ? "rounded px-2 py-1 text-xs font-medium uppercase bg-zinc-900 text-white"
              : "rounded px-2 py-1 text-xs font-medium uppercase text-zinc-600 hover:bg-zinc-100"
          }
          aria-current={code === locale ? "true" : undefined}
          title={localeLabels[code]}
        >
          {code}
        </Link>
      ))}
    </div>
  );
}
