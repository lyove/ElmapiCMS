import type { Metadata } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getServices, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import "./globals.css";

/** Global ISR window — must be a literal (Next.js parses segment config statically). */
export const revalidate = 3600;

const montserrat = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildMetadata({ settings });
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, services] = await Promise.all([
    getSiteSettings(),
    getServices(),
  ]);

  const navServices = services
    .filter((service) => service.fields.slug && service.fields.title)
    .map((service) => ({
      title: service.fields.title as string,
      slug: service.fields.slug as string,
    }));

  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${openSans.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans antialiased">
        <SiteHeader settings={settings} services={navServices} />
        <main className="flex-1">{children}</main>
        <SiteFooter settings={settings} />
      </body>
    </html>
  );
}
