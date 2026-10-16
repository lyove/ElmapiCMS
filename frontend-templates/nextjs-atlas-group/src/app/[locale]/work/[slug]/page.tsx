import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CaseStudyCard } from "@/components/case-study-card";
import { RichText } from "@/components/rich-text";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getCaseStudies,
  getCaseStudyBySlug,
  getCaseStudySlugs,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata, localePath } from "@/lib/seo";

type CaseStudyDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getCaseStudySlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: CaseStudyDetailPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const settings = await getSiteSettings(locale);

  try {
    const study = await getCaseStudyBySlug(locale, slug);
    const image = firstAsset(study.fields["featured-image"]);
    return buildMetadata({
      settings,
      locale,
      title: study.fields["meta-title"] || study.fields.title,
      description: study.fields["meta-description"] || study.fields.summary,
      path: `/work/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return buildMetadata({ settings, locale, title: "Case study", path: `/work/${slug}` });
  }
}

export default async function CaseStudyDetailPage({ params }: CaseStudyDetailPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);

  let study;
  try {
    study = await getCaseStudyBySlug(locale, slug);
  } catch {
    notFound();
  }

  const image = firstAsset(study.fields["featured-image"]);
  const results = study.fields.results ?? [];
  const services = study.fields.services ?? [];
  const allStudies = await getCaseStudies(locale);
  const related = allStudies.filter((item) => item.uuid !== study.uuid).slice(0, 2);

  return (
    <>
      <div className="grid-field border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <Link
            href={localePath(locale, "/work")}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"
          >
            <ArrowLeft className="size-4" />
            {dictionary.work.backToWork}
          </Link>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {study.fields.region ? <span>{study.fields.region}</span> : null}
            {study.fields.industry ? <span>{study.fields.industry}</span> : null}
          </div>
          <h1 className="font-heading mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            {study.fields.title}
          </h1>
          {study.fields.client ? (
            <p className="mt-5 text-sm text-muted-foreground">
              {dictionary.work.clientLabel}: {study.fields.client}
            </p>
          ) : null}
          {study.fields.summary ? (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {study.fields.summary}
            </p>
          ) : null}
        </div>
      </div>

      {image?.url ? (
        <div className="mx-auto max-w-6xl px-6 pt-10 md:pt-14">
          <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border bg-secondary">
            <Image
              src={image.url}
              alt={assetAlt(image, study.fields.title || "Case study")}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1152px"
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      {results.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <p className="coord-label mb-6">{dictionary.work.resultsHeading}</p>
          <dl className="grid gap-6 sm:grid-cols-3">
            {results.map((result) => (
              <div key={`${result.label}-${result.value}`} className="rounded-lg border border-border bg-card p-6">
                <dd className="font-heading text-3xl font-semibold text-primary">{result.value}</dd>
                <dt className="mt-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  {result.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <article className="mx-auto max-w-3xl px-6 pb-16">
        <RichText value={study.fields.body} />
      </article>

      {services.length > 0 ? (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <h2 className="font-heading mb-8 text-3xl font-semibold md:text-4xl">
              {dictionary.work.servicesHeading}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Link
                  key={service.uuid}
                  href={localePath(locale, `/services/${service.fields.slug}`)}
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-accent"
                >
                  <span className="font-heading font-semibold group-hover:text-accent">
                    {service.fields.title}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <h2 className="font-heading mb-10 text-3xl font-semibold md:text-4xl">
            {dictionary.work.relatedHeading}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {related.map((item, index) => (
              <CaseStudyCard
                key={item.uuid}
                study={item}
                locale={locale}
                featuredLabel={dictionary.work.featuredLabel}
                delayMs={index * 60}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
