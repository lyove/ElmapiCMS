import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCart } from "@/lib/cart";
import { getCategoryTree } from "@/lib/categories";
import { getCategories, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import "./globals.css";

/** Global ISR window; must be a literal (Next.js parses segment config statically). */
export const revalidate = 3600;

/** Geometric sans for the Auros-like furniture shop look. */
const sans = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* Headings share Montserrat; CSS --font-heading falls back via theme. */

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSiteSettings();
    const meta = buildMetadata({ settings });
    return {
      ...meta,
      metadataBase: new URL(
        settings.fields["site-url"] ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          "http://localhost:3000",
      ),
    };
  } catch {
    return {
      title: "Sable Goods",
      description: "Design-led home goods powered by Elmapi.",
      metadataBase: new URL(
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      ),
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings = null;
  let categoryTree = null;
  let cartCount = 0;
  try {
    const [settingsResult, categories, cartItems] = await Promise.all([
      getSiteSettings(),
      getCategories(),
      getCart(),
    ]);
    settings = settingsResult;
    categoryTree = getCategoryTree(categories);
    cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  } catch {
    settings = null;
    categoryTree = null;
    try {
      const cartItems = await getCart();
      cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    } catch {
      cartCount = 0;
    }
  }

  return (
    <html lang="en" className={`${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <Providers>
          {settings ? (
            <SiteHeader
              settings={settings}
              categoryTree={categoryTree ?? []}
              cartCount={cartCount}
            />
          ) : null}
          <main id="main-content" className="relative z-10 flex-1">
            {children}
          </main>
          {settings ? <SiteFooter settings={settings} /> : null}
        </Providers>
      </body>
    </html>
  );
}
