import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import "./globals.css";

/** Global ISR window; must be a literal (Next.js parses segment config statically). */
export const revalidate = 3600;

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

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
      title: "Northline Academy",
      description: "A membership learning hub powered by Elmapi.",
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
  try {
    settings = await getSiteSettings();
  } catch {
    settings = null;
  }

  return (
    <html
      lang="en"
      className={`${heading.variable} ${sans.variable} h-full`}
    >
      <body className="site-shell flex min-h-full flex-col font-sans antialiased">
        <Providers>
          {settings ? <SiteHeader settings={settings} /> : null}
          <main id="main-content" className="relative z-10 flex-1">
            {children}
          </main>
          {settings ? <SiteFooter settings={settings} /> : null}
        </Providers>
      </body>
    </html>
  );
}
