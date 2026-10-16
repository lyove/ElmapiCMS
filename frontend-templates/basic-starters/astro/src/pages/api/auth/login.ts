import type { APIRoute } from "astro";
import { ElmapiError } from "@elmapicms/js-sdk";
import { setAuthCookies } from "../../../lib/auth-cookies";
import { authUserFromMe } from "../../../lib/auth-user";
import { createAuthClient } from "../../../lib/elmapi-auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const client = createAuthClient();

  try {
    const result = await client.signInWithPassword({ email, password });
    const user = authUserFromMe(await client.me());

    setAuthCookies(cookies, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresAt: result.expires_at,
    });

    return Response.json({
      ok: true,
      user: {
        id: user.id || email,
        email: user.email || email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof ElmapiError) {
      return Response.json(
        { error: error.message || "Sign-in failed." },
        { status: error.statusCode || 401 },
      );
    }
    return Response.json({ error: "Sign-in failed." }, { status: 500 });
  }
};
