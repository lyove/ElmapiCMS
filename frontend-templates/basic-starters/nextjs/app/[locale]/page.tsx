import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ElmapiError } from "@elmapicms/js-sdk";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { getSiteSettings, listNotes } from "@/lib/content";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  try {
    const settings = await getSiteSettings(raw);
    return {
      title: settings?.fields["seo-title"] || settings?.fields["site-name"],
      description: settings?.fields["seo-description"] || settings?.fields.tagline,
    };
  } catch {
    return {};
  }
}

export default async function HomePage({ params }: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);

  let settings = null;
  let notes: Awaited<ReturnType<typeof listNotes>>["data"] = [];
  let loadError: string | null = null;

  try {
    settings = await getSiteSettings(locale);
    const listed = await listNotes(locale, { page: 1, perPage: 3 });
    notes = listed.data;
  } catch (error) {
    if (error instanceof ElmapiError) {
      loadError = dictionary.errors.loadFailed;
    } else {
      throw error;
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {settings?.fields["site-name"] || dictionary.home.title}
        </h1>
        <p className="max-w-2xl text-zinc-600">
          {settings?.fields.tagline || dictionary.home.intro}
        </p>
      </section>

      {loadError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{dictionary.home.latestNotes}</h2>
          <Link
            href={localePath(locale, "/notes")}
            className="text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
          >
            {dictionary.home.viewAll}
          </Link>
        </div>
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
          {notes.length === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-500">{dictionary.notes.empty}</li>
          ) : (
            notes.map((note) => (
              <li key={note.uuid}>
                <Link
                  href={localePath(locale, `/notes/${note.fields.slug}`)}
                  className="block px-4 py-3 hover:bg-zinc-50"
                >
                  <span className="font-medium">{note.fields.title}</span>
                  <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                    {note.fields.slug}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
