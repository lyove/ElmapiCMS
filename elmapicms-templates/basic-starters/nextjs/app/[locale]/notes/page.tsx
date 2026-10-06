import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ElmapiError } from "@elmapicms/js-sdk";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import {
  buildNotesWhere,
  countNotes,
  listNotes,
  listNotesOffset,
  type ListNotesOptions,
  type NoteSort,
} from "@/lib/content";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    perPage?: string;
    title?: string;
    slug?: string;
    slugLike?: string;
    author?: string;
    after?: string;
    or?: string;
    sort?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Notes",
};

const SORTS: NoteSort[] = [
  "published_at:desc",
  "published_at:asc",
  "title:asc",
  "title:desc",
];

function parseSort(value: string | undefined): NoteSort {
  if (value && (SORTS as string[]).includes(value)) {
    return value as NoteSort;
  }
  return "published_at:desc";
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export default async function NotesPage({ params, searchParams }: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page || "1") || 1);
  const perPage = [2, 5, 10].includes(Number(sp.perPage))
    ? Number(sp.perPage)
    : 5;
  const titleContains = (sp.title || "").trim();
  const slugEq = (sp.slug || "").trim();
  const slugContains = (sp.slugLike || "").trim();
  const authorContains = (sp.author || "").trim();
  const publishedAfter = (sp.after || "").trim();
  const matchTitleOrSlug = (sp.or || "").trim();
  const sort = parseSort(sp.sort);

  const listOptions: ListNotesOptions = {
    page,
    perPage,
    sort,
    titleContains: titleContains || undefined,
    slugEq: slugEq || undefined,
    slugContains: !slugEq && slugContains ? slugContains : undefined,
    authorContains: authorContains || undefined,
    publishedAfter: publishedAfter || undefined,
    matchTitleOrSlug: matchTitleOrSlug || undefined,
  };

  let notes: Awaited<ReturnType<typeof listNotes>> = { data: [], meta: {} };
  let totalCount = 0;
  let offsetSlice: Awaited<ReturnType<typeof listNotesOffset>> = [];
  let loadError: string | null = null;

  try {
    notes = await listNotes(locale, listOptions);
    totalCount = await countNotes(locale, listOptions);
    // Separate demo: first 2 matches via limit/offset (ignores page).
    offsetSlice = await listNotesOffset(locale, {
      ...listOptions,
      limit: 2,
      offset: 0,
    });
  } catch (error) {
    if (error instanceof ElmapiError) {
      loadError = dictionary.errors.loadFailed;
    } else {
      throw error;
    }
  }

  const lastPage = Math.max(1, notes.meta?.last_page ?? 1);
  const filterAction = localePath(locale, "/notes");
  const where = buildNotesWhere(listOptions);
  const queryPreview = {
    state: "published",
    locale,
    sort,
    paginate: perPage,
    page,
    ...(where ? { where } : {}),
  };

  const sharedParams = {
    title: titleContains || undefined,
    slug: slugEq || undefined,
    slugLike: slugContains || undefined,
    author: authorContains || undefined,
    after: publishedAfter || undefined,
    or: matchTitleOrSlug || undefined,
    sort,
    perPage,
  };

  const pageNumbers = Array.from({ length: lastPage }, (_, i) => i + 1).slice(
    0,
    8,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {dictionary.notes.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {totalCount} {dictionary.notes.results} · locale {locale}
        </p>
      </div>

      <form
        action={filterAction}
        method="get"
        className="space-y-3 rounded border border-zinc-200 bg-white p-4"
      >
        <h2 className="text-sm font-medium text-zinc-800">
          {dictionary.notes.filtersHeading}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600">{dictionary.notes.titleContains}</span>
            <input
              name="title"
              defaultValue={titleContains}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="BFF"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600">{dictionary.notes.slugEq}</span>
            <input
              name="slug"
              defaultValue={slugEq}
              className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
              placeholder="hello-elmapi"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600">{dictionary.notes.slugContains}</span>
            <input
              name="slugLike"
              defaultValue={slugContains}
              className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
              placeholder="filter"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600">{dictionary.notes.authorContains}</span>
            <input
              name="author"
              defaultValue={authorContains}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600">{dictionary.notes.publishedAfter}</span>
            <input
              name="after"
              type="date"
              defaultValue={publishedAfter}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600">{dictionary.notes.orTerm}</span>
            <input
              name="or"
              defaultValue={matchTitleOrSlug}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="hello"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600">{dictionary.notes.sort}</span>
            <select
              name="sort"
              defaultValue={sort}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              {SORTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600">{dictionary.notes.perPage}</span>
            <select
              name="perPage"
              defaultValue={String(perPage)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="2">2</option>
              <option value="5">5</option>
              <option value="10">10</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            {dictionary.notes.applyFilter}
          </button>
          <Link
            href={filterAction}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            {dictionary.notes.clearFilter}
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          Tip: `or` uses `where.or` and overrides title/slug fields above. Exact
          `slug` uses `eq` and wins over `slugLike`.
        </p>
      </form>

      <details className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-zinc-700">
          {dictionary.notes.queryPreview}
        </summary>
        <pre className="mt-2 overflow-x-auto font-mono text-xs text-zinc-700">
          {JSON.stringify(queryPreview, null, 2)}
        </pre>
      </details>

      {loadError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
        {notes.data.length === 0 ? (
          <li className="px-4 py-3 text-sm text-zinc-500">{dictionary.notes.empty}</li>
        ) : (
          notes.data.map((note) => (
            <li key={note.uuid}>
              <Link
                href={localePath(locale, `/notes/${note.fields.slug}`)}
                className="block px-4 py-3 hover:bg-zinc-50"
              >
                <span className="font-medium">{note.fields.title}</span>
                <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                  {note.fields.slug}
                  {note.fields["author-name"]
                    ? ` · ${note.fields["author-name"]}`
                    : ""}
                  {note.published_at
                    ? ` · ${note.published_at.slice(0, 10)}`
                    : ""}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-zinc-500">
          {dictionary.notes.page} {page} / {lastPage}
          {notes.meta?.total != null ? ` · ${notes.meta.total} total` : ""}
        </span>
        <div className="flex flex-wrap gap-1">
          {page > 1 ? (
            <Link
              href={`${filterAction}${buildQuery({ ...sharedParams, page: page - 1 })}`}
              className="rounded border border-zinc-300 px-3 py-1.5"
            >
              {dictionary.notes.prev}
            </Link>
          ) : null}
          {pageNumbers.map((n) => (
            <Link
              key={n}
              href={`${filterAction}${buildQuery({ ...sharedParams, page: n })}`}
              className={
                n === page
                  ? "rounded bg-zinc-900 px-3 py-1.5 text-white"
                  : "rounded border border-zinc-300 px-3 py-1.5"
              }
            >
              {n}
            </Link>
          ))}
          {page < lastPage ? (
            <Link
              href={`${filterAction}${buildQuery({ ...sharedParams, page: page + 1 })}`}
              className="rounded border border-zinc-300 px-3 py-1.5"
            >
              {dictionary.notes.next}
            </Link>
          ) : null}
        </div>
      </div>

      <section className="space-y-2 rounded border border-dashed border-zinc-300 p-4">
        <h2 className="text-sm font-medium text-zinc-800">
          {dictionary.notes.offsetDemo}
        </h2>
        <p className="text-xs text-zinc-500">
          <code>listNotesOffset</code> uses <code>limit</code> +{" "}
          <code>offset</code> (returns a plain array, not page meta).
        </p>
        <ul className="text-sm text-zinc-700">
          {offsetSlice.length === 0 ? (
            <li className="text-zinc-500">{dictionary.notes.empty}</li>
          ) : (
            offsetSlice.map((note) => (
              <li key={note.uuid} className="font-mono text-xs">
                {note.fields.slug}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
