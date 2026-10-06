import { NotFoundError } from "@elmapicms/js-sdk";
import type { Locale } from "@/i18n/config";
import { elmapi } from "./elmapi-server";
import type {
  ContentEntry,
  NoteFields,
  Paginated,
  SiteSettingsFields,
} from "./types";

export type NoteSort =
  | "published_at:desc"
  | "published_at:asc"
  | "title:asc"
  | "title:desc";

export type ListNotesOptions = {
  page?: number;
  perPage?: number;
  /** `where.title.like` */
  titleContains?: string;
  /** `where.slug.eq` (exact slug) */
  slugEq?: string;
  /** `where.slug.like` */
  slugContains?: string;
  /** `where.author-name.like` */
  authorContains?: string;
  /** `where.published_at.gte` (ISO date or datetime) */
  publishedAfter?: string;
  /** `where.or` demo: match title OR slug contains the same term */
  matchTitleOrSlug?: string;
  sort?: NoteSort;
};

export function asList<T>(response: T[] | { data: T[] } | unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T[] }).data;
  }
  return [];
}

/** Build the `where` object used by list/count. Kept shared so filters stay in sync. */
export function buildNotesWhere(
  options: ListNotesOptions = {},
): Record<string, unknown> | undefined {
  const where: Record<string, unknown> = {};

  if (options.matchTitleOrSlug) {
    const term = options.matchTitleOrSlug;
    where.or = [{ title: { like: term } }, { slug: { like: term } }];
  } else {
    if (options.titleContains) {
      where.title = { like: options.titleContains };
    }
    if (options.slugEq) {
      where.slug = { eq: options.slugEq };
    } else if (options.slugContains) {
      where.slug = { like: options.slugContains };
    }
  }

  if (options.authorContains) {
    where["author-name"] = { like: options.authorContains };
  }

  if (options.publishedAfter) {
    where.published_at = { gte: options.publishedAfter };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

/** Singleton: list() returns one object, not a paginated list. */
export async function getSiteSettings(
  locale: Locale,
): Promise<ContentEntry<SiteSettingsFields> | null> {
  try {
    return (await elmapi.content.list("site-settings", {
      state: "published",
      locale,
    })) as ContentEntry<SiteSettingsFields>;
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

/**
 * Paginated published notes with advanced `where` / `sort` / `paginate` examples.
 * See `buildNotesWhere` and the notes page query string for copyable patterns.
 */
export async function listNotes(
  locale: Locale,
  options: ListNotesOptions = {},
): Promise<Paginated<ContentEntry<NoteFields>>> {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 5;
  const sort = options.sort ?? "published_at:desc";
  const where = buildNotesWhere(options);

  const res = (await elmapi.content.list("notes", {
    state: "published",
    locale,
    sort,
    paginate: perPage,
    page,
    ...(where ? { where } : {}),
  })) as Paginated<ContentEntry<NoteFields>>;

  return {
    data: asList(res),
    meta: res.meta,
    links: res.links,
  };
}

/**
 * Get one published note by slug (`where.slug.eq` + `first: true`).
 */
export async function getNoteBySlug(
  locale: Locale,
  slug: string,
): Promise<ContentEntry<NoteFields> | null> {
  try {
    const res = (await elmapi.content.list("notes", {
      state: "published",
      locale,
      where: { slug: { eq: slug } },
      first: true,
    })) as ContentEntry<NoteFields>;
    if (!res?.uuid) return null;
    return res;
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

/** Count matching published notes (no entry payload). */
export async function countNotes(
  locale: Locale,
  options: ListNotesOptions = {},
): Promise<number> {
  const where = buildNotesWhere(options);
  const res = (await elmapi.content.list("notes", {
    state: "published",
    locale,
    count: true,
    ...(where ? { where } : {}),
  })) as { count: number };
  return res.count ?? 0;
}

/**
 * Offset/limit example (no `paginate`). Useful when you want a slice without Laravel page meta.
 */
export async function listNotesOffset(
  locale: Locale,
  options: { limit: number; offset: number; sort?: NoteSort } & ListNotesOptions,
): Promise<ContentEntry<NoteFields>[]> {
  const where = buildNotesWhere(options);
  const res = await elmapi.content.list("notes", {
    state: "published",
    locale,
    sort: options.sort ?? "published_at:desc",
    limit: options.limit,
    offset: options.offset,
    ...(where ? { where } : {}),
  });
  return asList(res);
}
