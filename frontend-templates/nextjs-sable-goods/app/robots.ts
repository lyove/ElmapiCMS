import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/content";
import { siteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const settings = await getSiteSettings();
    base = siteUrl(settings);
  } catch {
    // fallback already set
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/checkout",
          "/cart",
          "/login",
          "/register",
          "/verify-email",
          "/order/",
          "/api/",
        ],
      },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
