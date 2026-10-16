import { AuthenticationError, createClient } from "@elmapicms/js-sdk";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Revoke the Elmapi backend session before the client clears NextAuth state.
 * Cookie-clear-only logout is not complete logout.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const projectId = process.env.ELMAPI_PROJECT_ID;
  if (!secret || !projectId) {
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const token = await getToken({ req, secret });
  const accessToken = token?.accessToken as string | undefined;
  const refreshToken = token?.refreshToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ ok: true, revoked: false }, { status: 200 });
  }

  const client = createClient({
    baseUrl: process.env.ELMAPI_BASE_URL!,
    projectId,
    projectUserAuth: {
      accessToken,
      refreshToken,
      autoRefresh: false,
    },
  });

  try {
    await client.signOut();
    return NextResponse.json({ ok: true, revoked: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { ok: true, revoked: false, reason: "already_invalid" },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { ok: false, revoked: false, reason: "revoke_failed" },
      { status: 502 },
    );
  }
}
