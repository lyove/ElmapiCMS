import type { APIRoute } from "astro";
import { ElmapiError } from "@elmapicms/js-sdk";
import { setAuthCookies } from "../../../lib/auth-cookies";
import { authUserFromMe } from "../../../lib/auth-user";
import { createAuthClient } from "../../../lib/elmapi-auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string; display_name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const displayName = String(body.display_name ?? "").trim();

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const client = createAuthClient();

  try {
    const result = (await client.signUp({
      email,
      password,
      display_name: displayName || undefined,
    })) as Record<string, unknown>;

    if (result.verification_required) {
      return Response.json({
        ok: true,
        verification_required: true,
        verification_token:
          typeof result.verification_token === "string"
            ? result.verification_token
            : undefined,
        email,
      });
    }

    const accessToken =
      typeof result.access_token === "string" ? result.access_token : undefined;

    if (!accessToken) {
      return Response.json({
        ok: true,
        verification_required: false,
        needs_login: true,
        email,
      });
    }

    // Prefer session from signup tokens. Do not call password sign-in again.
    setAuthCookies(cookies, {
      accessToken,
      refreshToken:
        typeof result.refresh_token === "string"
          ? result.refresh_token
          : undefined,
      expiresAt:
        typeof result.expires_at === "string" ? result.expires_at : undefined,
    });

    let userId = email;
    let name = displayName || undefined;
    try {
      const user = authUserFromMe(await client.me());
      userId = user.id || email;
      name = user.name || displayName || undefined;
    } catch {
      // Tokens are enough even if me() fails.
    }

    return Response.json({
      ok: true,
      verification_required: false,
      user: { id: userId, email, name },
    });
  } catch (error) {
    if (error instanceof ElmapiError) {
      return Response.json(
        { error: error.message || "Registration failed." },
        { status: error.statusCode || 400 },
      );
    }
    return Response.json({ error: "Registration failed." }, { status: 500 });
  }
};
