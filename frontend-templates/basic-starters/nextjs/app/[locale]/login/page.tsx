import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, localePath, type Locale } from "@/i18n/config";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
};

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({ params, searchParams }: PageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl || localePath(locale, "/account");

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dictionary.auth.loginTitle}
      </h1>
      <LoginForm callbackUrl={callbackUrl} dictionary={dictionary.auth} />
      <p className="text-sm text-zinc-600">
        {dictionary.auth.noAccount}{" "}
        <Link
          href={localePath(locale, "/register")}
          className="underline underline-offset-2"
        >
          {dictionary.nav.register}
        </Link>
      </p>
    </div>
  );
}
