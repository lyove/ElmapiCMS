import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { ServicesGrid } from "@/components/services-grid";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getServices, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type ServicesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ServicesPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);
  const settings = await getSiteSettings(locale);

  return buildMetadata({
    settings,
    locale,
    title: dictionary.services.pageHeading,
    description: dictionary.services.pageIntro,
    path: "/services",
  });
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);
  const services = await getServices(locale);

  return (
    <>
      <PageIntro
        eyebrow={dictionary.services.pageEyebrow}
        title={dictionary.services.pageHeading}
        description={dictionary.services.pageIntro}
      />
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <ServicesGrid services={services} locale={locale} />
      </div>
    </>
  );
}
