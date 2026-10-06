"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label?: string;
  url?: string;
};

type SiteNavProps = {
  nav: NavItem[];
};

function isNavActive(pathname: string, url: string): boolean {
  if (url === "/" || url === "") {
    return pathname === "/" || pathname === "";
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function SiteNav({ nav }: SiteNavProps) {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const items = nav.filter((item) => item.url && item.label);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
        {items.map((item) => {
          const isActive = isNavActive(pathname, item.url!);
          return (
            <Link
              key={item.url}
              href={item.url!}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-muted md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-border/40 bg-background/95 shadow-lg backdrop-blur-md md:hidden">
          <nav
            id={panelId}
            className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4"
            aria-label="Main"
          >
            {items.map((item) => {
              const isActive = isNavActive(pathname, item.url!);
              return (
                <Link
                  key={item.url}
                  href={item.url!}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-foreground/90 hover:bg-muted",
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/contact"
              className="mt-2 rounded-full bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              onClick={() => setOpen(false)}
            >
              Start a project
            </Link>
          </nav>
        </div>
      ) : null}
    </>
  );
}
