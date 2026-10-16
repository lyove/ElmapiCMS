import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ShopMegaMenu } from "@/components/shop-mega-menu";
import type { CategoryTreeNode } from "@/lib/categories";
import type { ContentEntry, SiteSettingsFields } from "@/lib/types";

const OTHER_LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Shipping", href: "/shipping" },
  { label: "FAQ", href: "/faq" },
];

export function SiteHeader({
  settings,
  categoryTree,
  cartCount = 0,
}: {
  settings: ContentEntry<SiteSettingsFields>;
  categoryTree: CategoryTreeNode[];
  cartCount?: number;
}) {
  const siteName = settings.fields["site-name"] || "Sable Goods";

  return (
    <header className="relative sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3 justify-self-start">
          <div className="lg:hidden">
            <MobileNav categoryTree={categoryTree} />
          </div>
          <nav className="hidden items-center gap-6 lg:flex">
            <ShopMegaMenu tree={categoryTree} />
            {OTHER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70 transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link href="/" className="justify-self-center text-center">
          <span className="brand-mark">{siteName}</span>
        </Link>

        <div className="justify-self-end">
          <AuthNav cartCount={cartCount} />
        </div>
      </div>
    </header>
  );
}
