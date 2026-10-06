import { NextResponse } from "next/server";
import {
  type ElmapiWebhookPayload,
  handleWebhookRevalidation,
  isRevalidationConfigured,
  verifyRevalidateSecret,
} from "@/lib/revalidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isRevalidationConfigured()) {
    return NextResponse.json(
      {
        revalidated: false,
        reason: "REVALIDATE_SECRET is not configured",
      },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  if (!verifyRevalidateSecret(rawBody, request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ElmapiWebhookPayload;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as ElmapiWebhookPayload) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleWebhookRevalidation(payload);
    return NextResponse.json({
      revalidated: true,
      event: payload.event ?? null,
      collection: result.collection,
      paths: result.revalidated,
    });
  } catch {
    return NextResponse.json(
      { error: "Revalidation failed" },
      { status: 500 },
    );
  }
}
