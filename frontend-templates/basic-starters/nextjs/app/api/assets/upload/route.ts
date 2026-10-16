import { ElmapiError, ValidationError } from "@elmapicms/js-sdk";
import { NextRequest, NextResponse } from "next/server";
import { elmapi } from "@/lib/elmapi-server";

type UploadedAsset = {
  uuid: string;
  url?: string;
  title?: string;
  metadata?: { alt_text?: string | null; title?: string | null };
};

/**
 * BFF asset upload with the server-only project API token.
 * POST /files does not apply upload metadata today, so we set alt_text/title
 * with bulkUpdateMetadata after create.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
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

    return NextResponse.json({
      ok: true,
      uuid: asset.uuid,
      url: asset.url,
      title: title || asset.metadata?.title || asset.title,
      alt_text: altText || asset.metadata?.alt_text || null,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message || "Validation failed.", details: error.details },
        { status: 422 },
      );
    }
    if (error instanceof ElmapiError) {
      return NextResponse.json(
        { error: error.message || "Upload failed." },
        { status: error.statusCode || 400 },
      );
    }
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
