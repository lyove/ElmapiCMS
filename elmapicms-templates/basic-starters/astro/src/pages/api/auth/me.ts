import type { APIRoute } from "astro";
import { AuthenticationError, ElmapiError } from "@elmapicms/js-sdk";
import {
  clearAuthCookies,
  ensureFreshSession,
} from "../../../lib/auth-cookies";
import { authUserFromMe } from "../../../lib/auth-user";
import { createAuthClient } from "../../../lib/elmapi-auth";

export const GET: APIRoute = async ({ cookies }) => {
  const session = await ensureFreshSession(cookies);
  if (!session?.accessToken) {
    return Response.json({ authenticated: false, user: null });
  }

  try {
    const client = createAuthClient(session);
    const user = authUserFromMe(await client.me());
    return Response.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      clearAuthCookies(cookies);
      return Response.json({ authenticated: false, user: null });
    }
    if (error instanceof ElmapiError) {
      return Response.json(
        { error: error.message || "Failed to load user" },
        { status: error.statusCode || 502 },
      );
    }
    return Response.json({ error: "Failed to load user" }, { status: 500 });
  }
};
