import { NotFoundError } from "@elmapicms/js-sdk";
import { elmapi } from "./elmapi";
import type {
  ContentEntry,
  ListNotesOptions,
  Locale,
  NoteFields,
  NoteSort,
  Paginated,
  SiteSettingsFields,
} from "./types";

export function asList<T>(response: T[] | { data: T[] } | unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T[] }).data;
  }
  return [];
}

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
