import type { NextConfig } from "next";

type ImageRemotePattern = {
  protocol?: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
};

/** Allow next/image for the Elmapi host from ELMAPI_BASE_URL (set at build time). */
function elmapiRemotePatterns(): ImageRemotePattern[] {
  const patterns: ImageRemotePattern[] = [
    { protocol: "http", hostname: "localhost", pathname: "/**" },
  ];

  const base = process.env.ELMAPI_BASE_URL?.trim();
  if (!base) {
    patterns.push({
      protocol: "https",
      hostname: "elmapicms.test",
      pathname: "/uploads/**",
    });
    return patterns;
  }

  try {
    const url = new URL(base);
    patterns.push({
      protocol: url.protocol === "http:" ? "http" : "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/**",
    });
  } catch {
    // ignore invalid ELMAPI_BASE_URL
  }

  return patterns;
}

const nextConfig: NextConfig = {
  transpilePackages: ["@elmapicms/js-sdk"],
  images: {
    // Required for Herd / .test hosts that resolve to 127.0.0.1 (Next.js 16+)
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: elmapiRemotePatterns(),
  },
};

export default nextConfig;
