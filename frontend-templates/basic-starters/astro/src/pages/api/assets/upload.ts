import type { APIRoute } from "astro";
import { ElmapiError, ValidationError } from "@elmapicms/js-sdk";
import { elmapi } from "../../../lib/elmapi";

type UploadedAsset = {
  uuid: string;
  url?: string;
  title?: string;
  metadata?: { alt_text?: string | null; title?: string | null };
};

/**
 * BFF upload. POST /files ignores metadata, so alt_text/title are applied
 * afterward with bulkUpdateMetadata.
 */
export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart form data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "file is required." }, { status: 400 });
  }

  const altText = String(form.get("alt_text") ?? "").trim();
  const title = String(form.get("title") ?? file.name).trim();

  try {
    const asset = (await elmapi.assets.upload(file)) as UploadedAsset;

    if (altText || title) {
      await elmapi.assets.bulkUpdateMetadata({
        items: [
          {
            uuid: asset.uuid,
            ...(altText ? { alt_text: altText } : {}),
            ...(title ? { title } : {}),
          },
        ],
      });
    }

    return Response.json({
      ok: true,
      uuid: asset.uuid,
      url: asset.url,
      title: title || asset.metadata?.title || asset.title,
      alt_text: altText || asset.metadata?.alt_text || null,
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
        { error: error.message || "Upload failed." },
        { status: error.statusCode || 400 },
      );
    }
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
};
