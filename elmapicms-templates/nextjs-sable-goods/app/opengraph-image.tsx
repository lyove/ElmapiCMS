import { ImageResponse } from "next/og";

export const alt = "Sable Goods";
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
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFFFF",
          color: "#1A1A1A",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: 14,
            textTransform: "uppercase",
          }}
        >
          Sable Goods
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 24,
            color: "#8C8C8C",
            letterSpacing: 2,
          }}
        >
          Design-led home goods
        </div>
      </div>
    ),
    { ...size },
  );
}
