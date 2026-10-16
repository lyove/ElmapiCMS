import type { Metadata } from "next";
import { CaseStudyCard } from "@/components/case-study-card";
import { PageIntro } from "@/components/page-intro";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCaseStudies, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type WorkPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);
  const settings = await getSiteSettings(locale);

  return buildMetadata({
    settings,
    locale,
    title: dictionary.work.pageHeading,
    description: dictionary.work.pageIntro,
    path: "/work",
  });
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);
  const studies = await getCaseStudies(locale);

  return (
    <>
      <PageIntro
        eyebrow={dictionary.work.pageEyebrow}
        title={dictionary.work.pageHeading}
        description={dictionary.work.pageIntro}
      />
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        {studies.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {studies.map((study, index) => (
              <CaseStudyCard
                key={study.uuid}
                study={study}
                locale={locale}
                featuredLabel={dictionary.work.featuredLabel}
                delayMs={index * 60}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{dictionary.work.emptyState}</p>
        )}
      </div>
    </>
  );
}
