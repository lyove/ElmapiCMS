import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { RichText } from "@/components/rich-text";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getServiceBySlug, getServiceSlugs, getServices, getSiteSettings } from "@/lib/content";
import { buildMetadata, localePath } from "@/lib/seo";

type ServiceDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getServiceSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const settings = await getSiteSettings(locale);

  try {
    const service = await getServiceBySlug(locale, slug);
    return buildMetadata({
      settings,
      locale,
      title: service.fields["meta-title"] || service.fields.title,
      description: service.fields["meta-description"] || service.fields.summary,
      path: `/services/${slug}`,
    });
  } catch {
    return buildMetadata({ settings, locale, title: "Service", path: `/services/${slug}` });
  }
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);

  let service;
  try {
    service = await getServiceBySlug(locale, slug);
  } catch {
    notFound();
  }

  const allServices = await getServices(locale);
  const related = allServices.filter((item) => item.uuid !== service.uuid).slice(0, 3);
  const deliverables = service.fields.deliverables ?? [];

  return (
    <>
      <PageIntro eyebrow={dictionary.services.pageEyebrow} title={service.fields.title || ""} />

      <div className="mx-auto grid max-w-6xl gap-16 px-6 py-16 md:py-24 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <RichText value={service.fields.description} />
        </div>
        <div className="space-y-8">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon name={service.fields.icon} className="size-6" />
            </div>
            {deliverables.length > 0 ? (
              <>
                <p className="coord-label mb-3">{dictionary.services.deliverablesHeading}</p>
                <ul className="space-y-3">
                  {deliverables.map((item) => (
                    <li key={item.label} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <h2 className="font-heading mb-10 text-3xl font-semibold md:text-4xl">
              {dictionary.services.relatedHeading}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((item, index) => (
                <Reveal key={item.uuid} delayMs={index * 60}>
                  <Link
                    href={localePath(locale, `/services/${item.fields.slug}`)}
                    className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
                  >
                    <div className="mb-4 inline-flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon name={item.fields.icon} className="size-5" />
                    </div>
                    <p className="font-heading text-lg font-semibold group-hover:text-accent">
                      {item.fields.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.fields.summary}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
