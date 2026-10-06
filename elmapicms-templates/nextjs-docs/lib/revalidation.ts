import { createHmac, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NotFoundError } from "@elmapicms/js-sdk";
import { elmapi } from "./elmapi-server";

export const TEMPLATE_COLLECTION_SLUGS = [
  "site-settings",
  "doc-versions",
  "doc-categories",
  "doc-articles",
] as const;

export type TemplateCollectionSlug = (typeof TEMPLATE_COLLECTION_SLUGS)[number];

export type ElmapiWebhookPayload = {
  event?: string;
  project_uuid?: string;
  collection_id?: number;
  collection_slug?: string;
  content_id?: number;
  content_entry?: {
    uuid?: string;
    fields?: Record<string, unknown>;
  };
  timestamp?: string;
  delivery_id?: string;
};

const uuidToSlugCache = new Map<string, TemplateCollectionSlug>();

function parseCollectionIdMap(): Record<number, TemplateCollectionSlug> {
  const raw = process.env.REVALIDATION_COLLECTION_IDS;
  if (!raw?.trim()) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const map: Record<number, TemplateCollectionSlug> = {};
    for (const [id, slug] of Object.entries(parsed)) {
      if (TEMPLATE_COLLECTION_SLUGS.includes(slug as TemplateCollectionSlug)) {
        map[Number(id)] = slug as TemplateCollectionSlug;
      }
    }
    return map;
  } catch {
    return {};
  }
}

async function resolveSlugFromEntryUuid(
  uuid: string,
): Promise<TemplateCollectionSlug | null> {
  const cached = uuidToSlugCache.get(uuid);
  if (cached) return cached;

  for (const slug of TEMPLATE_COLLECTION_SLUGS) {
    try {
      await elmapi.content.get(slug, uuid);
      uuidToSlugCache.set(uuid, slug);
      return slug;
    } catch (error) {
      if (error instanceof NotFoundError) continue;
      throw error;
    }
  }

  return null;
}

export async function resolveCollectionSlug(
  payload: ElmapiWebhookPayload,
): Promise<TemplateCollectionSlug | null> {
  if (
    payload.collection_slug &&
    TEMPLATE_COLLECTION_SLUGS.includes(
      payload.collection_slug as TemplateCollectionSlug,
    )
  ) {
    return payload.collection_slug as TemplateCollectionSlug;
  }

  const idMap = parseCollectionIdMap();
  if (payload.collection_id != null && idMap[payload.collection_id] != null) {
    return idMap[payload.collection_id];
  }

  const entryUuid = payload.content_entry?.uuid;
  if (entryUuid) {
    return resolveSlugFromEntryUuid(entryUuid);
  }

  return null;
}

export function pathsForCollection(
  slug: TemplateCollectionSlug,
  fields?: Record<string, unknown>,
): { paths: string[]; revalidateLayout: boolean } {
  const paths = new Set<string>();
  let revalidateLayout = true;

  switch (slug) {
    case "site-settings":
    case "doc-versions":
    case "doc-categories":
      paths.add("/");
      break;
    case "doc-articles": {
      paths.add("/");
      const articleSlug = fields?.slug;
      const version =
        typeof fields?.version === "object" &&
        fields.version &&
        "fields" in (fields.version as object)
          ? (fields.version as { fields?: { slug?: string } }).fields?.slug
          : undefined;
      if (typeof articleSlug === "string" && articleSlug && version) {
        paths.add(`/v/${version}/${articleSlug}`);
      }
      break;
    }
    default:
      break;
  }

  return { paths: [...paths], revalidateLayout };
}

export function allTemplatePaths(): {
  paths: string[];
  revalidateLayout: boolean;
} {
  return {
    paths: ["/"],
    revalidateLayout: true,
  };
}

function applyRevalidation(
  paths: string[],
  revalidateLayout: boolean,
): string[] {
  const revalidated = new Set<string>();

  if (revalidateLayout) {
    revalidatePath("/", "layout");
    revalidated.add("/ (layout)");
  }

  for (const path of paths) {
    revalidatePath(path);
    revalidated.add(path);
  }

  revalidatePath("/sitemap.xml");
  revalidated.add("/sitemap.xml");

  return [...revalidated];
}

export function revalidateForCollection(
  slug: TemplateCollectionSlug,
  fields?: Record<string, unknown>,
): string[] {
  const { paths, revalidateLayout } = pathsForCollection(slug, fields);
  return applyRevalidation(paths, revalidateLayout);
}

export function revalidateAllTemplatePaths(): string[] {
  const { paths, revalidateLayout } = allTemplatePaths();
  return applyRevalidation(paths, revalidateLayout);
}

export function verifyRevalidateSecret(
  rawBody: string,
  request: Request,
): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get("x-revalidate-secret");
  if (headerSecret && headerSecret === secret) return true;

  const signature = request.headers.get("x-webhook-signature");
  if (signature) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      const a = Buffer.from(signature, "utf8");
      const b = Buffer.from(expected, "utf8");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  return false;
}

export function isRevalidationConfigured(): boolean {
  return Boolean(process.env.REVALIDATE_SECRET?.trim());
}

export async function handleWebhookRevalidation(
  payload: ElmapiWebhookPayload,
): Promise<{ revalidated: string[]; collection: string | null }> {
  const slug = await resolveCollectionSlug(payload);
  const fields = payload.content_entry?.fields;

  if (slug) {
    return {
      collection: slug,
      revalidated: revalidateForCollection(slug, fields),
    };
  }

  return {
    collection: null,
    revalidated: revalidateAllTemplatePaths(),
  };
}
