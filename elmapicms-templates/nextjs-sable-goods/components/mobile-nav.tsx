"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import type { CategoryTreeNode } from "@/lib/categories";
import { cn } from "@/lib/utils";

const OTHER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Shipping", href: "/shipping" },
  { label: "FAQ", href: "/faq" },
  { label: "Account", href: "/account" },
  { label: "Cart", href: "/cart" },
];

export function MobileNav({
  categoryTree,
}: {
  categoryTree: CategoryTreeNode[];
}) {
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
    setShopOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center border border-border text-ink transition-colors hover:border-ink"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-white shadow-sm">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-4 sm:px-8">
            <div className="border-b border-border">
              <button
                type="button"
                onClick={() => setShopOpen((value) => !value)}
                className="flex w-full items-center justify-between py-3 text-sm font-medium uppercase tracking-[0.12em] text-ink hover:text-teal"
                aria-expanded={shopOpen}
              >
                Shop
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    shopOpen ? "rotate-180" : "",
                  )}
                />
              </button>
              {shopOpen ? (
                <div className="pb-3 pl-3">
                  <Link
                    href="/shop"
                    onClick={closeMenu}
                    className="block py-2 text-[13px] text-stone hover:text-teal"
                  >
                    Shop all
                  </Link>
                  {categoryTree.map(({ root, children }) => {
                    const rootSlug = root.fields.slug;
                    return (
                      <div key={root.uuid} className="mt-2">
                        <Link
                          href={
                            rootSlug ? `/shop?category=${rootSlug}` : "/shop"
                          }
                          onClick={closeMenu}
                          className="block py-1 text-[13px] font-medium text-ink hover:text-teal"
                        >
                          {root.fields.title}
                        </Link>
                        {children.length > 0 ? (
                          <ul className="mt-1 space-y-1 border-l border-border pl-3">
                            {children.map((child) => {
                              const childSlug = child.fields.slug;
                              if (!childSlug) return null;
                              return (
                                <li key={child.uuid}>
                                  <Link
                                    href={`/shop?category=${childSlug}`}
                                    onClick={closeMenu}
                                    className="block py-1 text-[12px] text-stone hover:text-teal"
                                  >
                                    {child.fields.title}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {OTHER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="border-b border-border py-3 text-sm font-medium uppercase tracking-[0.12em] text-ink last:border-b-0 hover:text-teal"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
