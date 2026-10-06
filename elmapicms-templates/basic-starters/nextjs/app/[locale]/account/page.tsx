import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, localePath, type Locale } from "@/i18n/config";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage({ params }: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);
  const session = await auth();

  if (!session?.accessToken || session.authError) {
    redirect(localePath(locale, "/login"));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dictionary.account.title}
      </h1>
      <p className="text-sm text-zinc-700">
        {dictionary.account.signedInAs}{" "}
        <strong>{session.user?.email || session.user?.id}</strong>
      </p>
      {session.user?.name ? (
        <p className="text-sm text-zinc-600">{session.user.name}</p>
      ) : null}
      <p className="max-w-xl rounded border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
        {dictionary.account.sessionNote}
      </p>
    </div>
  );
}
