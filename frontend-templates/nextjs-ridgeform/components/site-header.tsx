"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Mail, Menu, Phone, X } from "lucide-react";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";
import { cn } from "@/lib/utils";

export type NavServiceItem = {
  title: string;
  slug: string;
};

type SiteHeaderProps = {
  settings: ContentEntry<SiteSettingsFields>;
  services?: NavServiceItem[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isServicesNav(url: string) {
  return url === "/services" || url.startsWith("/services/");
}

export function SiteHeader({ settings, services = [] }: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [desktopServicesOpen, setDesktopServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuId = useId();
  const name = settings.fields["company-name"] || "Ridgeform";
  const nav = settings.fields.navigation ?? [];
  const showUtilityBar = settings.fields["show-utility-bar"] !== false;
  const hasServiceLinks = services.length > 0;

  useEffect(() => {
    setDesktopServicesOpen(false);
    setMobileServicesOpen(false);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!desktopServicesOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!desktopMenuRef.current?.contains(event.target as Node)) {
        setDesktopServicesOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDesktopServicesOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [desktopServicesOpen]);

  const linkClass = (href: string, mobile = false) =>
    cn(
      "font-semibold uppercase tracking-wide transition-colors",
      mobile ? "py-2 text-sm" : "text-sm",
      isActivePath(pathname, href)
        ? "text-safety"
        : "text-ink hover:text-safety",
    );

  function closeMenus() {
    setOpen(false);
    setDesktopServicesOpen(false);
    setMobileServicesOpen(false);
  }

  function ServicesMenu({ mobile }: { mobile: boolean }) {
    return (
      <div
        className={cn(
          mobile
            ? "mt-2 overflow-hidden border border-border bg-smoke"
            : "absolute left-0 top-full z-50 w-[280px] pt-3",
        )}
        role={mobile ? undefined : "menu"}
      >
        <div
          className={cn(
            !mobile &&
              "border border-border border-t-2 border-t-safety bg-white shadow-[0_12px_32px_rgba(17,17,17,0.12)]",
          )}
        >
          <div
            className={cn(
              "border-b border-border",
              mobile ? "bg-white px-4 py-3" : "px-5 py-3.5",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Our services
            </p>
            <Link
              href="/services"
              role={mobile ? undefined : "menuitem"}
              className={cn(
                "mt-1 inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wide transition-colors",
                pathname === "/services"
                  ? "text-safety"
                  : "text-ink hover:text-safety",
              )}
              onClick={closeMenus}
            >
              View all
              <span aria-hidden className="text-safety">
                →
              </span>
            </Link>
          </div>

          <ul className={cn(mobile ? "bg-white py-1" : "py-2")}>
            {services.map((service, index) => {
              const href = `/services/${service.slug}`;
              const active = isActivePath(pathname, href);
              return (
                <li key={service.slug}>
                  <Link
                    href={href}
                    role={mobile ? undefined : "menuitem"}
                    className={cn(
                      "group flex items-start gap-3 px-4 py-3 transition-colors",
                      !mobile && "px-5",
                      active ? "bg-smoke" : "hover:bg-smoke",
                    )}
                    onClick={closeMenus}
                  >
                    <span
                      className={cn(
                        "font-heading mt-0.5 text-xs font-extrabold tabular-nums",
                        active
                          ? "text-safety"
                          : "text-muted-foreground group-hover:text-safety",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold uppercase leading-snug tracking-wide transition-colors",
                        active
                          ? "text-safety"
                          : "text-ink group-hover:text-safety",
                      )}
                    >
                      {service.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  function renderNavItem(
    item: { label?: string; url?: string },
    mobile: boolean,
  ) {
    if (!item.url || !item.label) return null;

    if (isServicesNav(item.url) && hasServiceLinks) {
      if (mobile) {
        return (
          <div key={`m-${item.label}`}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-2 text-left",
                linkClass(item.url, true),
              )}
              aria-expanded={mobileServicesOpen}
              onClick={() => setMobileServicesOpen((value) => !value)}
            >
              <span>{item.label}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 transition-transform",
                  mobileServicesOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {mobileServicesOpen ? <ServicesMenu mobile /> : null}
          </div>
        );
      }

      return (
        <div
          key={`${item.label}-${item.url}`}
          ref={desktopMenuRef}
          className="relative"
          onMouseEnter={() => setDesktopServicesOpen(true)}
          onMouseLeave={() => setDesktopServicesOpen(false)}
        >
          <div className="inline-flex items-center gap-1">
            <Link
              href={item.url}
              className={linkClass(item.url)}
              aria-current={
                isActivePath(pathname, item.url) ? "page" : undefined
              }
            >
              {item.label}
            </Link>
            <button
              type="button"
              className={cn(
                "inline-flex size-5 items-center justify-center transition-colors",
                isActivePath(pathname, item.url)
                  ? "text-safety"
                  : "text-ink hover:text-safety",
              )}
              aria-expanded={desktopServicesOpen}
              aria-controls={desktopMenuId}
              aria-haspopup="menu"
              aria-label={`${item.label} menu`}
              onClick={() => setDesktopServicesOpen((value) => !value)}
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  desktopServicesOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </div>
          <div
            id={desktopMenuId}
            className={cn(desktopServicesOpen ? "block" : "hidden")}
          >
            <ServicesMenu mobile={false} />
          </div>
        </div>
      );
    }

    return (
      <Link
        key={mobile ? `m-${item.label}` : `${item.label}-${item.url}`}
        href={item.url}
        className={linkClass(item.url, mobile)}
        aria-current={isActivePath(pathname, item.url) ? "page" : undefined}
        onClick={mobile ? () => setOpen(false) : undefined}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-50">
      {showUtilityBar ? (
        <div className="bg-smoke text-xs">
          <div className="site-shell flex flex-wrap items-center justify-between gap-2 py-1.5">
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground sm:gap-5">
              {settings.fields.email ? (
                <a
                  href={`mailto:${settings.fields.email}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
                >
                  <Mail className="size-3 text-safety" />
                  <span className="hidden sm:inline">{settings.fields.email}</span>
                </a>
              ) : null}
              {settings.fields.phone ? (
                <a
                  href={`tel:${settings.fields.phone.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
                >
                  <Phone className="size-3 text-safety" />
                  {settings.fields.phone}
                </a>
              ) : null}
            </div>
            <Link
              href="/contact"
              className="btn-cta btn-cta-brand !min-h-7 !px-3 !text-[10px]"
            >
              Make an Appointment
            </Link>
          </div>
        </div>
      ) : null}

      <div className="border-b border-border bg-white">
        <div className="site-shell flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center bg-safety text-lg font-black text-ink">
              R
            </span>
            <span>
              <span className="font-heading block text-xl font-extrabold uppercase tracking-wide text-ink sm:text-2xl">
                {name}
              </span>
              {settings.fields.tagline ? (
                <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                  {settings.fields.tagline}
                </span>
              ) : null}
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            <Link
              href="/"
              className={linkClass("/")}
              aria-current={isActivePath(pathname, "/") ? "page" : undefined}
            >
              Home
            </Link>
            {nav.map((item) => renderNavItem(item, false))}
          </nav>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center bg-ink text-white lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-b border-border bg-white lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="site-shell flex flex-col gap-1 py-4" aria-label="Mobile">
          <Link
            href="/"
            className={linkClass("/", true)}
            aria-current={isActivePath(pathname, "/") ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Home
          </Link>
          {nav.map((item) => renderNavItem(item, true))}
        </nav>
      </div>
    </header>
  );
}
