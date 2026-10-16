import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import "../globals.css";

/** Global ISR window; must be a literal (Next.js parses segment config statically). */
export const revalidate = 3600;

const heading = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const settings = await getSiteSettings(locale);
  return buildMetadata({ settings, locale });
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;

  const [settings, dictionary] = await Promise.all([
    getSiteSettings(locale),
    Promise.resolve(getDictionary(locale)),
  ]);

  return (
    <html lang={locale} className={`${heading.variable} ${sans.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <SiteHeader settings={settings} locale={locale} dictionary={dictionary} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter settings={settings} locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}
