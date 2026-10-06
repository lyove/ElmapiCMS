import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ElmapiError } from "@elmapicms/js-sdk";
import { RichText } from "@/components/rich-text";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { getNoteBySlug } from "@/lib/content";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  try {
    const note = await getNoteBySlug(raw, slug);
    if (!note) return { title: "Not found" };
    return {
      title: note.fields["seo-title"] || note.fields.title,
      description: note.fields["seo-description"],
    };
  } catch {
    return {};
  }
}

export default async function NotePage({ params }: PageProps) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);

  let note = null;
  try {
    note = await getNoteBySlug(locale, slug);
  } catch (error) {
    if (error instanceof ElmapiError) {
      return (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {dictionary.errors.loadFailed}
        </p>
      );
    }
    throw error;
  }

  if (!note) notFound();

  return (
    <article className="space-y-6">
      <div>
        <Link
          href={localePath(locale, "/notes")}
          className="text-sm text-zinc-500 underline underline-offset-2"
        >
          {dictionary.notes.backToList}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {note.fields.title}
        </h1>
        {note.fields["author-name"] ? (
          <p className="mt-1 text-sm text-zinc-500">
            {dictionary.notes.author}: {note.fields["author-name"]}
          </p>
        ) : null}
      </div>
      <RichText value={note.fields.body} />
    </article>
  );
}
