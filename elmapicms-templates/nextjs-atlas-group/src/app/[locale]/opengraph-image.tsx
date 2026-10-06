import { ImageResponse } from "next/og";
import { isLocale, type Locale } from "@/i18n/config";
import { getSiteSettings } from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const settings = await getSiteSettings(locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#fbfaf7",
          backgroundImage:
            "linear-gradient(to right, rgba(30,41,59,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,41,59,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 32,
            fontWeight: 600,
            color: "#e08a3e",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {settings.fields["site-name"]}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            maxWidth: 900,
            fontSize: 56,
            fontWeight: 700,
            color: "#1e2a45",
            lineHeight: 1.15,
          }}
        >
          {settings.fields.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
