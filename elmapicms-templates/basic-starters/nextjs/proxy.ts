import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import authConfig from "@/auth.config";
import { defaultLocale, isLocale, locales } from "@/i18n/config";

const { auth } = NextAuth(authConfig);

function detectLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language");
  if (!header) return defaultLocale;

  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const lang of preferred) {
    const short = lang.split("-")[0];
    if (isLocale(short)) return short;
  }

  return defaultLocale;
}

function isProtectedPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2 || !isLocale(segments[0])) return false;
  const rest = `/${segments.slice(1).join("/")}`;
  return rest === "/account" || rest.startsWith("/account/");
}

/**
 * Locale redirect + auth guard for /account only.
 * Uses edge-safe `auth.config` (no Elmapi SDK) so Netlify can bundle the proxy.
 * New note and upload are public BFF demos (still use the server API key).
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const locale = detectLocale(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const hasSession = Boolean(req.auth?.accessToken) && !req.auth?.authError;

  if (isProtectedPath(pathname) && !hasSession) {
    const locale = pathname.split("/").filter(Boolean)[0] || defaultLocale;
    const login = new URL(`/${locale}/login`, req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    if (req.auth?.authError) {
      login.searchParams.set("error", "session");
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
