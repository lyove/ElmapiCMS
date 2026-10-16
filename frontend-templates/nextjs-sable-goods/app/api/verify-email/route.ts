import { createClient, ElmapiError } from "@elmapicms/js-sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const projectId = process.env.ELMAPI_PROJECT_ID;
  if (!projectId) {
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Token is required." }, { status: 400 });
  }

  const client = createClient({
    baseUrl: process.env.ELMAPI_BASE_URL!,
    projectId,
  });

  try {
    await client.confirmVerificationEmail({ token });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ElmapiError) {
      return NextResponse.json(
        { error: error.message || "Verification failed." },
        { status: error.statusCode || 400 },
      );
    }
    return NextResponse.json(
      { error: "Verification failed." },
      { status: 500 },
    );
  }
}
