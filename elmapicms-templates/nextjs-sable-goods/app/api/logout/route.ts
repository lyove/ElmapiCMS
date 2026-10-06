import { AuthenticationError, createClient } from "@elmapicms/js-sdk";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Revoke the Elmapi backend session before the client clears NextAuth state.
 * Cookie-clear-only logout is not complete logout.
 */
export async function POST() {
  const projectId = process.env.ELMAPI_PROJECT_ID;
  if (!projectId) {
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const session = await auth();
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ ok: true, revoked: false }, { status: 200 });
  }

  const client = createClient({
    baseUrl: process.env.ELMAPI_BASE_URL!,
    projectId,
    projectUserAuth: {
      accessToken,
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
