"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  locale: Locale;
  label: string;
};

/** Swap the leading /xx locale segment in the current path, keeping the rest. */
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
          className={cn(
            "rounded-md px-2 py-1 font-mono text-xs uppercase tracking-wider transition-colors",
            code === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-current={code === locale ? "true" : undefined}
          title={localeLabels[code]}
        >
          {code}
        </Link>
      ))}
    </div>
  );
}
