import { cache } from "react";
import { NotFoundError } from "@elmapicms/js-sdk";
import { elmapi } from "./elmapi-server";
import type {
  ContentEntry,
  DocArticleFields,
  DocCategoryFields,
  DocVersionFields,
  NavCategory,
  SearchItem,
  SiteSettingsFields,
} from "./types";

export function asList<T>(response: T[] | { data: T[] } | unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T[] }).data;
  }
  return [];
}

function bySortOrder<T extends { fields: { "sort-order"?: string | number } }>(
  a: T,
  b: T,
): number {
  return Number(a.fields["sort-order"] ?? 0) - Number(b.fields["sort-order"] ?? 0);
}

export const getSiteSettings = cache(async (): Promise<
  ContentEntry<SiteSettingsFields>
> => {
  return elmapi.content.list("site-settings", {
    state: "published",
  }) as Promise<ContentEntry<SiteSettingsFields>>;
});

export const getVersions = cache(async (): Promise<
  ContentEntry<DocVersionFields>[]
> => {
  const res = await elmapi.content.list("doc-versions", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<DocVersionFields>>(res).sort(bySortOrder);
});

export const getDefaultVersion = cache(async (): Promise<
  ContentEntry<DocVersionFields>
> => {
  const versions = await getVersions();
  const preferred =
    versions.find((version) => version.fields["is-default"]) || versions[0];
  if (!preferred?.fields.slug) {
    throw new NotFoundError("No published doc versions found");
  }
  return preferred;
});

export const getVersionBySlug = cache(
  async (slug: string): Promise<ContentEntry<DocVersionFields>> => {
    const versions = await getVersions();
    const entry = versions.find((version) => version.fields.slug === slug);
    if (!entry) throw new NotFoundError("Version not found");
    return entry;
  },
);

export const getCategories = cache(async (): Promise<
  ContentEntry<DocCategoryFields>[]
> => {
  const res = await elmapi.content.list("doc-categories", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<DocCategoryFields>>(res).sort(bySortOrder);
});

export const getAllArticles = cache(async (): Promise<
  ContentEntry<DocArticleFields>[]
> => {
  const res = await elmapi.content.list("doc-articles", {
    state: "published",
    sort: "sort-order:asc",
  });
  return asList<ContentEntry<DocArticleFields>>(res).sort(bySortOrder);
});

export async function getArticles(
  versionSlug?: string,
): Promise<ContentEntry<DocArticleFields>[]> {
  const articles = await getAllArticles();
  if (!versionSlug) return articles;
  return articles.filter(
    (article) => article.fields.version?.fields.slug === versionSlug,
  );
}

export const getCategoryBySlug = cache(
  async (slug: string): Promise<ContentEntry<DocCategoryFields>> => {
    const categories = await getCategories();
    const entry = categories.find((category) => category.fields.slug === slug);
    if (!entry) throw new NotFoundError("Category not found");
    return entry;
  },
);

export async function getArticleBySlug(
  versionSlug: string,
  slug: string,
): Promise<ContentEntry<DocArticleFields>> {
  const articles = await getArticles(versionSlug);
  const entry = articles.find((article) => article.fields.slug === slug);
  if (!entry) throw new NotFoundError("Article not found");
  return entry;
}

export const getDocsNav = cache(
  async (versionSlug: string): Promise<NavCategory[]> => {
    const [categories, articles] = await Promise.all([
      getCategories(),
      getArticles(versionSlug),
    ]);

    return categories
      .map((category) => {
        const categoryArticles = articles
          .filter((article) => article.fields.category?.uuid === category.uuid)
          .map((article) => ({
            uuid: article.uuid,
            title: article.fields.title || "Untitled",
            slug: article.fields.slug || article.uuid,
            summary: article.fields.summary || "",
            sortOrder: Number(article.fields["sort-order"] ?? 0),
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return {
          uuid: category.uuid,
          title: category.fields.title || "Untitled",
          slug: category.fields.slug || category.uuid,
          description: category.fields.description || "",
          sortOrder: Number(category.fields["sort-order"] ?? 0),
          defaultOpen: category.fields["default-open"] !== false,
          articles: categoryArticles,
        };
      })
      .filter((category) => category.articles.length > 0);
  },
);

export async function getSearchIndex(
  versionSlug: string,
): Promise<SearchItem[]> {
  const nav = await getDocsNav(versionSlug);
  return nav.flatMap((category) =>
    category.articles.map((article) => ({
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      categoryTitle: category.title,
    })),
  );
}

export function getPrevNext(
  nav: NavCategory[],
  articleSlug: string,
): {
  prev: { title: string; slug: string } | null;
  next: { title: string; slug: string } | null;
} {
  for (const category of nav) {
    const index = category.articles.findIndex((a) => a.slug === articleSlug);
    if (index === -1) continue;
    const prev = index > 0 ? category.articles[index - 1] : null;
    const next =
      index < category.articles.length - 1
        ? category.articles[index + 1]
        : null;
    return {
      prev: prev ? { title: prev.title, slug: prev.slug } : null,
      next: next ? { title: next.title, slug: next.slug } : null,
    };
  }
  return { prev: null, next: null };
}

export function versionPath(versionSlug: string, path = ""): string {
  const normalized = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/v/${versionSlug}${normalized}`;
}
