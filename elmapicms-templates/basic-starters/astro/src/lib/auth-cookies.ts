import type { AstroCookies } from "astro";
import { createAuthClient } from "./elmapi-auth";

const ACCESS = "elmapi_access_token";
const REFRESH = "elmapi_refresh_token";
const EXPIRES = "elmapi_expires_at";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: import.meta.env.PROD,
};

export function setAuthCookies(
  cookies: AstroCookies,
  tokens: { accessToken: string; refreshToken?: string; expiresAt?: string },
) {
  cookies.set(ACCESS, tokens.accessToken, cookieOpts);
  if (tokens.refreshToken) {
    cookies.set(REFRESH, tokens.refreshToken, cookieOpts);
  }
  if (tokens.expiresAt) {
    cookies.set(EXPIRES, tokens.expiresAt, cookieOpts);
  }
}

export function clearAuthCookies(cookies: AstroCookies) {
  cookies.delete(ACCESS, { path: "/" });
  cookies.delete(REFRESH, { path: "/" });
  cookies.delete(EXPIRES, { path: "/" });
}

export function getAuthCookies(cookies: AstroCookies) {
  return {
    accessToken: cookies.get(ACCESS)?.value,
    refreshToken: cookies.get(REFRESH)?.value,
    expiresAt: cookies.get(EXPIRES)?.value,
  };
}

/** Refresh rotated tokens when access token is expired. */
export async function ensureFreshSession(cookies: AstroCookies) {
  const current = getAuthCookies(cookies);
  if (!current.accessToken) return null;

  const expired =
    current.expiresAt &&
    Date.now() >= new Date(current.expiresAt).getTime();

  if (!expired) return current;

  if (!current.refreshToken) {
    clearAuthCookies(cookies);
    return null;
  }

  const client = createAuthClient({
    accessToken: current.accessToken,
    refreshToken: current.refreshToken,
  });

  try {
    const refreshed = await client.refreshSession();
    const next = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? current.refreshToken,
      expiresAt: refreshed.expires_at,
    };
    setAuthCookies(cookies, next);
    return next;
  } catch {
    clearAuthCookies(cookies);
    return null;
  }
}
