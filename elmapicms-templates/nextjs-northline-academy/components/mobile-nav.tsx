"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { NorthlineMark } from "@/components/mark";
import { buttonVariants } from "@/components/ui/button";
import type { NavLink } from "@/lib/types";
import { cn } from "@/lib/utils";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function MobileNav({
  siteName,
  nav,
  signedIn,
  memberLabel,
  memberUrl,
}: {
  siteName: string;
  nav: NavLink[];
  signedIn: boolean;
  memberLabel: string;
  memberUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const isClient = useIsClient();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const panel =
    open && isClient
      ? createPortal(
          <div
            id="mobile-nav"
            className="fixed inset-0 z-[60] bg-white lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <div className="mx-auto flex h-full max-w-7xl flex-col px-5 sm:px-8">
              <div className="flex h-[73px] items-center justify-between gap-4 border-b border-border">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 items-center gap-3"
                >
                  <NorthlineMark className="shrink-0" />
                  <span className="truncate font-heading text-lg font-semibold tracking-tight text-ink">
                    {siteName}
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-ink"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-6">
                {nav.map((item) =>
                  item.label && item.url ? (
                    <Link
                      key={`${item.label}-${item.url}`}
                      href={item.url}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-3 py-3 text-lg font-semibold text-ink hover:bg-surface"
                    >
                      {item.label}
                    </Link>
                  ) : null,
                )}

                <div className="mt-6 grid gap-3 border-t border-border pt-6">
                  {signedIn ? (
                    <Link
                      href="/members"
                      onClick={() => setOpen(false)}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-coral text-white hover:bg-coral/90",
                      )}
                    >
                      Open library
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={memberUrl}
                        onClick={() => setOpen(false)}
                        className={cn(
                          buttonVariants({ size: "lg", variant: "outline" }),
                        )}
                      >
                        {memberLabel}
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setOpen(false)}
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "bg-coral text-white hover:bg-coral/90",
                        )}
                      >
                        Join
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-ink"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {panel}
    </div>
  );
}
