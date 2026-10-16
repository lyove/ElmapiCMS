import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, localePath, type Locale } from "@/i18n/config";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function RegisterPage({ params }: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dictionary.auth.registerTitle}
      </h1>
      <RegisterForm locale={locale} dictionary={dictionary.auth} />
      <p className="text-sm text-zinc-600">
        {dictionary.auth.hasAccount}{" "}
        <Link
          href={localePath(locale, "/login")}
          className="underline underline-offset-2"
        >
          {dictionary.nav.login}
        </Link>
      </p>
    </div>
  );
}
