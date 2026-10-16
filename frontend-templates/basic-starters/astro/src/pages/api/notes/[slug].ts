import type { APIRoute } from "astro";
import { ElmapiError } from "@elmapicms/js-sdk";
import { getNoteBySlug } from "../../../lib/content";
import { isLocale } from "../../../lib/i18n";
import { richTextToHtml } from "../../../lib/rich-text";

export const GET: APIRoute = async ({ params, url }) => {
  const slug = params.slug;
  const locale = String(url.searchParams.get("locale") || "en");

  if (!slug) {
    return Response.json({ error: "Missing slug" }, { status: 400 });
  }
  if (!isLocale(locale)) {
    return Response.json({ error: "Unsupported locale" }, { status: 400 });
  }

  try {
    const note = await getNoteBySlug(locale, slug);
    if (!note) {
      return Response.json({ error: "Note not found" }, { status: 404 });
    }
    return Response.json({
      note,
      html: richTextToHtml(note.fields.body),
    });
  } catch (error) {
    if (error instanceof ElmapiError) {
      return Response.json(
        { error: error.message || "Failed to load note" },
        { status: error.statusCode || 502 },
      );
    }
    return Response.json({ error: "Failed to load note" }, { status: 500 });
  }
};
