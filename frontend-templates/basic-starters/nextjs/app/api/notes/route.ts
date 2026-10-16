import {
  AuthenticationError,
  ElmapiError,
  ValidationError,
} from "@elmapicms/js-sdk";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/elmapi-auth";
import { elmapi } from "@/lib/elmapi-server";
import { isLocale } from "@/i18n/config";

type CreateNoteBody = {
  title?: string;
  slug?: string;
  body?: string;
  locale?: string;
};

/**
 * BFF create note with the server project API token.
 * If a project user session exists, call me() and persist author-* fields.
 * Auth is optional for this demo route.
 */
export async function POST(req: NextRequest) {
  let body: CreateNoteBody;
  try {
    body = (await req.json()) as CreateNoteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const slug = String(body.slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
  const markdown = String(body.body ?? "").trim();
  const locale = String(body.locale ?? "en").trim();

  if (!title || !slug || !markdown) {
    return NextResponse.json(
      { error: "title, slug, and body are required." },
      { status: 400 },
    );
  }
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  let authorName: string | undefined;
  let authorUserId: string | undefined;

  const secret = process.env.AUTH_SECRET;
  if (secret) {
    const token = await getToken({ req, secret });
    const accessToken = token?.accessToken as string | undefined;
    const refreshToken = token?.refreshToken as string | undefined;

    if (accessToken && !token?.authError) {
      try {
        const authClient = createAuthClient({ accessToken, refreshToken });
        const me = (await authClient.me()) as Record<string, unknown>;
        authorUserId = String(me.uuid ?? me.id ?? "") || undefined;
        authorName =
          (me.display_name as string | undefined) ||
          (me.email as string | undefined) ||
          "Project user";
      } catch (error) {
        if (!(error instanceof AuthenticationError)) {
          return NextResponse.json(
            { error: "Could not verify identity." },
            { status: 502 },
          );
        }
        // Expired session: still allow anonymous create for this public demo.
      }
    }
  }

  try {
    const entry = (await elmapi.content.create("notes", {
      data: {
        title,
        slug,
        body: markdown,
        ...(authorName ? { "author-name": authorName } : {}),
        ...(authorUserId ? { "author-user-id": authorUserId } : {}),
        "seo-title": title,
        "seo-description": title,
      },
      state: "published",
      locale,
    })) as { uuid: string };

    return NextResponse.json({
      ok: true,
      uuid: entry.uuid,
      slug,
      locale,
      authorAttached: Boolean(authorUserId),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message || "Validation failed.",
          details: error.details,
        },
        { status: 422 },
      );
    }
    if (error instanceof ElmapiError) {
      return NextResponse.json(
        { error: error.message || "Create failed." },
        { status: error.statusCode || 400 },
      );
    }
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }
}
