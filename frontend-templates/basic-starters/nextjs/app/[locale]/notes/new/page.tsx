import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewNoteForm } from "@/components/new-note-form";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: "New note",
};

export default async function NewNotePage({ params }: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {dictionary.newNote.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{dictionary.newNote.intro}</p>
      </div>
      <NewNoteForm locale={locale} dictionary={dictionary.newNote} />
    </div>
  );
}
