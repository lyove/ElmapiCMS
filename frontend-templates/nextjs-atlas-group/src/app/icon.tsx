import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e2a45",
          borderRadius: 6,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#e08a3e" strokeWidth="1.6" />
          <path d="M12 4 L13.6 12 L12 20 L10.4 12 Z" fill="#fbfaf7" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
