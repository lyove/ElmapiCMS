import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

/** Time-based ISR baseline (1 hour). See lib/cache.ts and README. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSiteSettings();
    return {
      ...buildMetadata({ settings, path: "/" }),
      metadataBase: new URL(
        settings.fields["site-url"] ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          "http://localhost:3000",
      ),
    };
  } catch {
    return {
      metadataBase: new URL(
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      ),
      title: "Docs",
      description: "Product documentation and help center.",
    };
  }
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
