import type { APIRoute } from "astro";
import {
  AuthenticationError,
  ElmapiError,
  ValidationError,
} from "@elmapicms/js-sdk";
import { ensureFreshSession } from "../../../lib/auth-cookies";
import { authUserFromMe } from "../../../lib/auth-user";
import {
  buildNotesWhere,
  countNotes,
  listNotes,
  listNotesOffset,
} from "../../../lib/content";
import { elmapi } from "../../../lib/elmapi";
import { createAuthClient } from "../../../lib/elmapi-auth";
import { isLocale } from "../../../lib/i18n";
import type { ListNotesOptions, NoteSort } from "../../../lib/types";

const SORTS: NoteSort[] = [
  "published_at:desc",
  "published_at:asc",
  "title:asc",
  "title:desc",
];

export const GET: APIRoute = async ({ url }) => {
  const locale = String(url.searchParams.get("locale") || "en");
  if (!isLocale(locale)) {
    return Response.json({ error: "Unsupported locale" }, { status: 400 });
  }

  const sortValue = String(
    url.searchParams.get("sort") || "published_at:desc",
  );
  const options: ListNotesOptions = {
    page: Math.max(1, Number(url.searchParams.get("page") || 1) || 1),
    perPage: [2, 5, 10].includes(Number(url.searchParams.get("perPage")))
      ? Number(url.searchParams.get("perPage"))
      : 5,
    sort: (SORTS as string[]).includes(sortValue)
      ? (sortValue as NoteSort)
      : "published_at:desc",
    titleContains: String(url.searchParams.get("title") || "").trim() || undefined,
    slugEq: String(url.searchParams.get("slug") || "").trim() || undefined,
    slugContains:
      String(url.searchParams.get("slugLike") || "").trim() || undefined,
    authorContains:
      String(url.searchParams.get("author") || "").trim() || undefined,
    publishedAfter:
      String(url.searchParams.get("after") || "").trim() || undefined,
    matchTitleOrSlug:
      String(url.searchParams.get("or") || "").trim() || undefined,
  };

  if (options.slugEq) options.slugContains = undefined;

  try {
    const where = buildNotesWhere(options);
    const [notes, total, offsetSlice] = await Promise.all([
      listNotes(locale, options),
      countNotes(locale, options),
      listNotesOffset(locale, { ...options, limit: 2, offset: 0 }),
    ]);

    return Response.json({
      notes,
      total,
      offsetSlice,
      query: {
        state: "published",
        locale,
        sort: options.sort,
        paginate: options.perPage,
        page: options.page,
        ...(where ? { where } : {}),
      },
    });
  } catch (error) {
    if (error instanceof ElmapiError) {
      return Response.json(
        { error: error.message || "Failed to list notes" },
        { status: error.statusCode || 502 },
      );
    }
    return Response.json({ error: "Failed to list notes" }, { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: {
    title?: string;
    slug?: string;
    body?: string;
    locale?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
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
    return Response.json(
      { error: "title, slug, and body are required." },
      { status: 400 },
    );
  }
  if (!isLocale(locale)) {
    return Response.json({ error: "Unsupported locale." }, { status: 400 });
  }

  let authorName: string | undefined;
  let authorUserId: string | undefined;

  const session = await ensureFreshSession(cookies);
  if (session?.accessToken) {
    try {
      const authClient = createAuthClient(session);
      const user = authUserFromMe(await authClient.me());
      authorUserId = user.id || undefined;
      authorName = user.name || user.email || "Project user";
    } catch (error) {
      if (!(error instanceof AuthenticationError)) {
        return Response.json(
          { error: "Could not verify identity." },
          { status: 502 },
        );
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

    return Response.json({
      ok: true,
      uuid: entry.uuid,
      slug,
      locale,
      authorAttached: Boolean(authorUserId),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json(
        {
          error: error.message || "Validation failed.",
          details: error.details,
        },
        { status: 422 },
      );
    }
    if (error instanceof ElmapiError) {
      return Response.json(
        { error: error.message || "Create failed." },
        { status: error.statusCode || 400 },
      );
    }
    return Response.json({ error: "Create failed." }, { status: 500 });
  }
};
