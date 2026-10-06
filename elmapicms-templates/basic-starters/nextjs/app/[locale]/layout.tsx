import { notFound } from "next/navigation";
import { ElmapiError } from "@elmapicms/js-sdk";
import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getSiteSettings } from "@/lib/content";
import { LocaleHtmlLang } from "@/components/locale-html-lang";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dictionary = getDictionary(locale);

  let siteName = "Elmapi Basic Starter";
  try {
    const settings = await getSiteSettings(locale);
    siteName = settings?.fields["site-name"] || siteName;
  } catch (error) {
    if (!(error instanceof ElmapiError)) throw error;
  }

  return (
    <div className="flex min-h-full flex-col">
      <LocaleHtmlLang locale={locale} />
      <SiteHeader locale={locale} dictionary={dictionary} siteName={siteName} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
        Elmapi basic starter · {locale}
      </footer>
    </div>
  );
}
