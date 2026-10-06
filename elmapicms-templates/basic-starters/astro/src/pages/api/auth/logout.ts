import type { APIRoute } from "astro";
import { AuthenticationError } from "@elmapicms/js-sdk";
import {
  clearAuthCookies,
  getAuthCookies,
} from "../../../lib/auth-cookies";
import { createAuthClient } from "../../../lib/elmapi-auth";

/**
 * Revoke the Elmapi backend session before clearing cookies.
 * Cookie-clear-only logout is not complete logout.
 */
export const POST: APIRoute = async ({ cookies }) => {
  const current = getAuthCookies(cookies);

  if (!current.accessToken) {
    clearAuthCookies(cookies);
    return Response.json({ ok: true, revoked: false });
  }

  const client = createAuthClient({
    accessToken: current.accessToken,
    refreshToken: current.refreshToken,
  });

  try {
    await client.signOut();
    clearAuthCookies(cookies);
    return Response.json({ ok: true, revoked: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      clearAuthCookies(cookies);
      return Response.json({
        ok: true,
        revoked: false,
        reason: "already_invalid",
      });
    }
    return Response.json(
      { ok: false, revoked: false, reason: "revoke_failed" },
      { status: 502 },
    );
  }
};
