import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/content";

export const alt = "Documentation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  let title = "Docs";
  let tagline = "Product documentation";

  try {
    const settings = await getSiteSettings();
    title = settings.fields["site-name"] || title;
    tagline = settings.fields.tagline || tagline;
  } catch {
    // defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(160deg, #F3F6F8 0%, #E7EEF2 55%, #D9E6EC 100%)",
          color: "#15202B",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#0A6B74",
            fontFamily: "sans-serif",
            fontWeight: 600,
          }}
        >
          Documentation
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            {title}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#4A5B6A",
              fontFamily: "sans-serif",
              maxWidth: 900,
            }}
          >
            {tagline}
          </div>
        </div>
        <div
          style={{
            height: 6,
            width: 160,
            background: "#0A6B74",
            borderRadius: 999,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
