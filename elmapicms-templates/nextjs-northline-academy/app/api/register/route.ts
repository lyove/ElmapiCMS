import { createClient, ElmapiError } from "@elmapicms/js-sdk";
import { NextResponse } from "next/server";

type RegisterBody = {
  email?: string;
  password?: string;
  display_name?: string;
};

/**
 * Project user sign-up. If Elmapi returns tokens, the client establishes a
 * NextAuth session from those tokens without a second password sign-in.
 * If verification is required, the client shows the verify-email flow.
 */
export async function POST(request: Request) {
  const projectId = process.env.ELMAPI_PROJECT_ID;
  if (!projectId) {
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const displayName = String(body.display_name ?? "").trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const client = createClient({
    baseUrl: process.env.ELMAPI_BASE_URL!,
    projectId,
  });

  try {
    const result = (await client.signUp({
      email,
      password,
      display_name: displayName || undefined,
    })) as Record<string, unknown>;

    const verificationRequired = Boolean(result.verification_required);
    const verificationToken =
      typeof result.verification_token === "string"
        ? result.verification_token
        : undefined;

    if (verificationRequired) {
      return NextResponse.json({
        ok: true,
        verification_required: true,
        verification_token: verificationToken,
        email,
      });
    }

    const accessToken =
      typeof result.access_token === "string" ? result.access_token : undefined;
    if (!accessToken) {
      return NextResponse.json({
        ok: true,
        verification_required: false,
        needs_login: true,
        email,
      });
    }

    let userId = email;
    let name = displayName || undefined;
    try {
      const me = (await client.me()) as Record<string, unknown>;
      userId = String(me.uuid ?? me.id ?? email);
      name =
        (me.display_name as string | undefined) ||
        displayName ||
        undefined;
    } catch {
      // Session tokens are enough to proceed even if me() fails.
    }

    return NextResponse.json({
      ok: true,
      verification_required: false,
      email,
      userId,
      name,
      accessToken,
      refreshToken:
        typeof result.refresh_token === "string" ? result.refresh_token : "",
      expiresAt:
        typeof result.expires_at === "string" ? result.expires_at : "",
    });
  } catch (error) {
    if (error instanceof ElmapiError) {
      return NextResponse.json(
        { error: error.message || "Registration failed." },
        { status: error.statusCode || 400 },
      );
    }
    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 },
    );
  }
}
