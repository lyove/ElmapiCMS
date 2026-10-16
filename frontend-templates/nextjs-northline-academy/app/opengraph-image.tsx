import { ImageResponse } from "next/og";

export const alt = "Northline Academy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 72,
          background:
            "linear-gradient(135deg, #0F2F28 0%, #1F5C4B 45%, #6B8FA8 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, opacity: 0.8 }}>
          MEMBERSHIP LEARNING HUB
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 16 }}>
          Northline Academy
        </div>
        <div style={{ fontSize: 32, marginTop: 20, opacity: 0.9 }}>
          Study with a clearer north.
        </div>
      </div>
    ),
    { ...size },
  );
}
