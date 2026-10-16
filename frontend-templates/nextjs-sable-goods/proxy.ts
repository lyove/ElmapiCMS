import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Lightweight route guard for /checkout and /account.
 * Uses edge-safe `auth.config` (no Elmapi SDK) so Netlify can bundle the proxy.
 * Server Components on those routes also call auth() for defense in depth.
 */
export const proxy = auth((req) => {
  const path = req.nextUrl.pathname;
  const hasSession = Boolean(req.auth?.accessToken) && !req.auth?.authError;

  if (
    (path.startsWith("/checkout") ||
      path.startsWith("/account") ||
      path.startsWith("/order/")) &&
    !hasSession
  ) {
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
  matcher: ["/checkout/:path*", "/account/:path*", "/order/:path*"],
};
