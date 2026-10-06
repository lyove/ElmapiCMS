import { defineMiddleware } from "astro:middleware";
import { ensureFreshSession } from "./lib/auth-cookies";
import { defaultLocale, isLocale, locales, localePath } from "./lib/i18n";

function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);
  for (const lang of preferred) {
    const short = lang.split("-")[0];
    if (isLocale(short)) return short;
  }
  return defaultLocale;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_") ||
    pathname.includes(".")
  ) {
    return next();
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const locale = detectLocale(context.request.headers.get("accept-language"));
    const target = `/${locale}${pathname === "/" ? "" : pathname}`;
    return context.redirect(target);
  }

  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0];
  const rest = `/${segments.slice(1).join("/")}`;
  const isAccount = rest === "/account" || rest.startsWith("/account/");

  if (isAccount && isLocale(locale)) {
    const session = await ensureFreshSession(context.cookies);
    if (!session?.accessToken) {
      const login = new URL(localePath(locale, "/login"), context.url.origin);
      login.searchParams.set("callbackUrl", pathname);
      return context.redirect(login.toString());
    }
  }

  return next();
});
