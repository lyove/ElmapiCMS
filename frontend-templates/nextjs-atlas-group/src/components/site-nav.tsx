"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/lib/seo";
import type { NavLink } from "@/lib/types";
import { cn } from "@/lib/utils";

type SiteNavProps = {
  nav: NavLink[];
  locale: Locale;
  openMenuLabel: string;
  closeMenuLabel: string;
};

function isNavActive(pathname: string, locale: Locale, url: string): boolean {
  const href = localePath(locale, url);
  if (url === "/" || url === "") {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkClassName(isContact: boolean, isActive: boolean, mobile = false) {
  if (mobile) {
    return cn(
      "rounded-lg px-4 py-3 text-base font-medium transition-colors",
      isContact
        ? isActive
          ? "bg-primary text-primary-foreground"
          : "border border-border text-foreground hover:bg-muted"
        : isActive
          ? "bg-muted text-foreground"
          : "text-foreground hover:bg-muted",
    );
  }

  return cn(
    "rounded-md px-3 py-1.5 text-sm transition-colors",
    isContact
      ? isActive
        ? "bg-primary text-primary-foreground"
        : "border border-border text-foreground hover:bg-muted"
      : isActive
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function SiteNav({ nav, locale, openMenuLabel, closeMenuLabel }: SiteNavProps) {
  const pathname = usePathname() || "";
  const [openPath, setOpenPath] = useState<string | null>(null);
  const panelId = useId();
  const open = openPath === pathname;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPath(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const items = nav.filter((item) => item.url);

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
        {items.map((item) => {
          const href = localePath(locale, item.url!);
          const isActive = isNavActive(pathname, locale, item.url!);
          const isContact = item.url === "/contact";

          return (
            <Link
              key={item.url}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={linkClassName(isContact, isActive)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenPath((current) => (current === pathname ? null : pathname))}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        <span className="sr-only">{open ? closeMenuLabel : openMenuLabel}</span>
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-border bg-background shadow-sm md:hidden">
          <nav id={panelId} className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4" aria-label="Main">
            {items.map((item) => {
              const href = localePath(locale, item.url!);
              const isActive = isNavActive(pathname, locale, item.url!);
              const isContact = item.url === "/contact";

              return (
                <Link
                  key={item.url}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={linkClassName(isContact, isActive, true)}
                  onClick={() => setOpenPath(null)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </>
  );
}
