import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UploadForm } from "@/components/upload-form";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: "Upload",
};

export default async function UploadPage({ params }: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {dictionary.upload.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{dictionary.upload.intro}</p>
      </div>
      <UploadForm dictionary={dictionary.upload} />
    </div>
  );
}
