import { createHmac, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NotFoundError } from "@elmapicms/js-sdk";
import { locales } from "@/i18n/config";
import { elmapi } from "./elmapi-server";

/** Collections used by this template (Elmapi slugs). */
export const TEMPLATE_COLLECTION_SLUGS = [
  "site-settings",
  "home-page",
  "about-page",
  "contact-page",
  "services",
  "case-studies",
  "locations",
  "blog-categories",
  "authors",
  "blog-posts",
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

/** Expand an unprefixed path (e.g. "/about") into every locale-prefixed route. */
function forEachLocale(path: string, paths: Set<string>): void {
  for (const locale of locales) {
    paths.add(path === "" ? `/${locale}` : `/${locale}${path}`);
  }
}

/** Paths (+ layout flag) to invalidate for a collection change, across all locales. */
export function pathsForCollection(
  slug: TemplateCollectionSlug,
  fields?: Record<string, unknown>,
): { paths: string[]; revalidateLayout: boolean } {
  const paths = new Set<string>();
  let revalidateLayout = false;

  switch (slug) {
    case "site-settings":
      revalidateLayout = true;
      forEachLocale("", paths);
      forEachLocale("/about", paths);
      forEachLocale("/services", paths);
      forEachLocale("/work", paths);
      forEachLocale("/locations", paths);
      forEachLocale("/blog", paths);
      forEachLocale("/contact", paths);
      break;
    case "home-page":
      forEachLocale("", paths);
      break;
    case "about-page":
      forEachLocale("/about", paths);
      break;
    case "locations": {
      forEachLocale("/locations", paths);
      forEachLocale("/about", paths);
      const locationSlug = fields?.slug;
      if (typeof locationSlug === "string" && locationSlug) {
        forEachLocale(`/locations/${locationSlug}`, paths);
      }
      break;
    }
    case "contact-page":
    case "faqs":
      forEachLocale("/contact", paths);
      break;
    case "services": {
      forEachLocale("/services", paths);
      forEachLocale("/work", paths);
      forEachLocale("/locations", paths);
      forEachLocale("", paths);
      const serviceSlug = fields?.slug;
      if (typeof serviceSlug === "string" && serviceSlug) {
        forEachLocale(`/services/${serviceSlug}`, paths);
      }
      break;
    }
    case "case-studies": {
      forEachLocale("/work", paths);
      forEachLocale("", paths);
      const studySlug = fields?.slug;
      if (typeof studySlug === "string" && studySlug) {
        forEachLocale(`/work/${studySlug}`, paths);
      }
      break;
    }
    case "blog-categories":
      forEachLocale("/blog", paths);
      break;
    case "authors":
      forEachLocale("/blog", paths);
      break;
    case "blog-posts": {
      forEachLocale("/blog", paths);
      forEachLocale("", paths);
      const postSlug = fields?.slug;
      if (typeof postSlug === "string" && postSlug) {
        forEachLocale(`/blog/${postSlug}`, paths);
      }
      break;
    }
    default:
      break;
  }

  return { paths: [...paths], revalidateLayout };
}

/** Broad invalidation when collection cannot be resolved (e.g. permanent delete). */
export function allTemplatePaths(): { paths: string[]; revalidateLayout: boolean } {
  const paths = new Set<string>();
  forEachLocale("", paths);
  forEachLocale("/about", paths);
  forEachLocale("/services", paths);
  forEachLocale("/work", paths);
  forEachLocale("/locations", paths);
  forEachLocale("/blog", paths);
  forEachLocale("/contact", paths);
  return { paths: [...paths], revalidateLayout: true };
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

function applyRevalidation(paths: string[], revalidateLayout: boolean): string[] {
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
