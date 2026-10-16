"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { assetAlt, firstAsset } from "@/lib/assets";
import type { CategoryTreeNode } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function ShopMegaMenu({ tree }: { tree: CategoryTreeNode[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }, [clearCloseTimer]);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const featured = tree[0];
  const featuredImage = featured
    ? firstAsset(featured.root.fields.image)
    : null;

  return (
    <div
      ref={rootRef}
      className="static"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <Link
        href="/shop"
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70 transition-colors hover:text-ink"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onFocus={openMenu}
        onBlur={(event) => {
          if (
            !rootRef.current?.contains(event.relatedTarget as Node | null)
          ) {
            scheduleClose();
          }
        }}
      >
        Shop
        <ChevronDown
          className={cn(
            "size-3.5 stroke-[1.75] transition-transform duration-200",
            open ? "rotate-180" : "",
          )}
          aria-hidden
        />
      </Link>

      {open ? (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full z-50 border-b border-border bg-white shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-[1fr_16rem]">
            <div className="grid gap-8 px-5 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 xl:grid-cols-5">
              {tree.map(({ root, children }) => {
                const rootSlug = root.fields.slug;
                return (
                  <div key={root.uuid} className="min-w-0">
                    <Link
                      href={rootSlug ? `/shop?category=${rootSlug}` : "/shop"}
                      className="block text-[12px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:text-teal"
                      onClick={() => setOpen(false)}
                    >
                      {root.fields.title}
                    </Link>
                    <ul className="mt-3 space-y-2">
                      {children.map((child) => {
                        const childSlug = child.fields.slug;
                        if (!childSlug) return null;
                        return (
                          <li key={child.uuid}>
                            <Link
                              href={`/shop?category=${childSlug}`}
                              className="block text-[13px] leading-5 text-stone transition-colors hover:text-ink"
                              onClick={() => setOpen(false)}
                            >
                              {child.fields.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="hidden border-l border-border bg-mist lg:block">
              <Link
                href="/shop"
                className="group flex h-full flex-col"
                onClick={() => setOpen(false)}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-white">
                  {featuredImage?.url ? (
                    <Image
                      src={featuredImage.url}
                      alt={assetAlt(
                        featuredImage,
                        featured?.root.fields.title || "Shop",
                      )}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      sizes="256px"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col justify-center px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal">
                    Shop all
                  </p>
                  <p className="mt-2 text-[13px] leading-5 text-stone">
                    {featured?.root.fields.summary ||
                      "Ceramics, linen, glass, lamps, and objects."}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
