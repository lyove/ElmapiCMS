import { createHmac, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NotFoundError } from "@elmapicms/js-sdk";
import { elmapi } from "./elmapi-server";

/** Collections used by this template (Elmapi slugs). */
export const TEMPLATE_COLLECTION_SLUGS = [
  "site-settings",
  "home-hero",
  "contact-page",
  "services",
  "case-studies",
  "team-members",
  "testimonials",
  "insights",
  "faqs",
] as const;

export type TemplateCollectionSlug = (typeof TEMPLATE_COLLECTION_SLUGS)[number];

export type ElmapiWebhookPayload = {
  event?: string;
  project_uuid?: string;
  collection_id?: number;
  /** Not sent by Elmapi today; supported for manual calls / future payloads. */
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
      if (
        TEMPLATE_COLLECTION_SLUGS.includes(slug as TemplateCollectionSlug)
      ) {
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
  if (
    payload.collection_id != null &&
    idMap[payload.collection_id] != null
  ) {
    return idMap[payload.collection_id];
  }

  const entryUuid = payload.content_entry?.uuid;
  if (entryUuid) {
    return resolveSlugFromEntryUuid(entryUuid);
  }

  return null;
}

/** Paths (+ layout flag) to invalidate for a collection change. */
export function pathsForCollection(
  slug: TemplateCollectionSlug,
  fields?: Record<string, unknown>,
): { paths: string[]; revalidateLayout: boolean } {
  const paths = new Set<string>();
  let revalidateLayout = false;

  switch (slug) {
    case "site-settings":
      revalidateLayout = true;
      paths.add("/");
      paths.add("/contact");
      paths.add("/work");
      paths.add("/services");
      paths.add("/team");
      paths.add("/insights");
      break;
    case "home-hero":
      paths.add("/");
      break;
    case "contact-page":
      paths.add("/contact");
      break;
    case "services":
      paths.add("/services");
      paths.add("/");
      break;
    case "case-studies": {
      paths.add("/work");
      paths.add("/");
      const studySlug = fields?.slug;
      if (typeof studySlug === "string" && studySlug) {
        paths.add(`/work/${studySlug}`);
      }
      break;
    }
    case "team-members":
      paths.add("/team");
      paths.add("/insights");
      paths.add("/");
      break;
    case "testimonials":
      paths.add("/");
      break;
    case "insights": {
      paths.add("/insights");
      paths.add("/");
      const insightSlug = fields?.slug;
      if (typeof insightSlug === "string" && insightSlug) {
        paths.add(`/insights/${insightSlug}`);
      }
      break;
    }
    case "faqs":
      paths.add("/contact");
      break;
    default:
      break;
  }

  return { paths: [...paths], revalidateLayout };
}

/** Broad invalidation when collection cannot be resolved (e.g. permanent delete). */
export function allTemplatePaths(): { paths: string[]; revalidateLayout: boolean } {
  return {
    paths: [
      "/",
      "/work",
      "/services",
      "/team",
      "/insights",
      "/contact",
    ],
    revalidateLayout: true,
  };
}

export function revalidateForCollection(
  slug: TemplateCollectionSlug,
  fields?: Record<string, unknown>,
): string[] {
  const { paths, revalidateLayout } = pathsForCollection(slug, fields);
  return applyRevalidation(paths, revalidateLayout, slug);
}

export function revalidateAllTemplatePaths(): string[] {
  const { paths, revalidateLayout } = allTemplatePaths();
  return applyRevalidation(paths, revalidateLayout);
}

function applyRevalidation(
  paths: string[],
  revalidateLayout: boolean,
  _slug?: TemplateCollectionSlug,
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

  // Cache tags (elmapi:{slug}, elmapi:site) are reserved for future unstable_cache wiring.

  return [...revalidated];
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
