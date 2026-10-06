import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Lightweight route guard for /members.
 * Uses edge-safe `auth.config` (no Elmapi SDK) so Netlify can bundle the proxy.
 * Server Components under /members also call auth() for defense in depth.
 */
export const proxy = auth((req) => {
  const path = req.nextUrl.pathname;
  const hasSession = Boolean(req.auth?.accessToken) && !req.auth?.authError;

  if (path.startsWith("/members") && !hasSession) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", path);
    if (req.auth?.authError) {
      login.searchParams.set("error", "session");
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/members/:path*"],
};
