import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { BlogCard } from "@/components/blog-card";
import { CaseStudyCard } from "@/components/case-study-card";
import { HeroSection } from "@/components/hero-section";
import { HighlightsGrid } from "@/components/highlights-grid";
import { Reveal } from "@/components/reveal";
import { RichText } from "@/components/rich-text";
import { SectionHeading } from "@/components/page-intro";
import { ServicesGrid } from "@/components/services-grid";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getFeaturedBlogPosts,
  getFeaturedCaseStudies,
  getHomePage,
  getServices,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata, localePath } from "@/lib/seo";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const [settings, home] = await Promise.all([getSiteSettings(locale), getHomePage(locale)]);
  const heroImage = firstAsset(home.fields["hero-image"]);

  return buildMetadata({
    settings,
    locale,
    title: home.fields["meta-title"] || home.fields.headline,
    description: home.fields["meta-description"],
    imageUrl: heroImage?.url,
  });
}

export default async function HomePage({ params }: LocalePageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);

  const [home, services, studies, posts] = await Promise.all([
    getHomePage(locale),
    getServices(locale),
    getFeaturedCaseStudies(locale),
    getFeaturedBlogPosts(locale),
  ]);

  const introImage = firstAsset(home.fields["intro-image"]);
  const hasIntro =
    home.fields["intro-heading"] ||
    home.fields["intro-body"] ||
    introImage ||
    (home.fields.highlights?.length ?? 0) > 0;

  return (
    <>
      <HeroSection home={home} locale={locale} />

      {hasIntro ? (
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
              {introImage?.url ? (
                <Reveal>
                  <div className="relative aspect-[5/4] overflow-hidden rounded-xl border border-border bg-card">
                    <Image
                      src={introImage.url}
                      alt={assetAlt(introImage, home.fields["intro-heading"] || "Atlas Group")}
                      fill
                      sizes="(max-width: 1024px) 100vw, 480px"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
              ) : null}
              <div>
                <Reveal delayMs={introImage ? 80 : 0}>
                  {home.fields["intro-heading"] ? (
                    <h2 className="font-heading text-3xl font-semibold md:text-4xl">
                      {home.fields["intro-heading"]}
                    </h2>
                  ) : null}
                </Reveal>
                <Reveal delayMs={introImage ? 140 : 60}>
                  <RichText value={home.fields["intro-body"]} className="mt-6" />
                </Reveal>
                <Reveal delayMs={introImage ? 200 : 120}>
                  <div className="mt-8 grid gap-3 border-l-2 border-accent/60 pl-5 sm:grid-cols-3">
                    {dictionary.home.introRegions.map((region) => (
                      <p key={region} className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                        {region}
                      </p>
                    ))}
                  </div>
                </Reveal>
              </div>
            </div>
            {(home.fields.highlights?.length ?? 0) > 0 ? (
              <div className="mt-14">
                <HighlightsGrid highlights={home.fields.highlights ?? []} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {services.length > 0 ? (
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <SectionHeading
              eyebrow={dictionary.services.pageEyebrow}
              title={dictionary.home.servicesHeading}
              description={dictionary.home.servicesSubheading}
              action={
                <Link
                  href={localePath(locale, "/services")}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-accent"
                >
                  {dictionary.home.servicesViewAll}
                  <ArrowUpRight className="size-4" />
                </Link>
              }
            />
            <ServicesGrid services={services.slice(0, 4)} locale={locale} />
          </div>
        </section>
      ) : null}

      {studies.length > 0 ? (
        <section className="border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <SectionHeading
              eyebrow={dictionary.work.pageEyebrow}
              title={dictionary.home.workHeading}
              description={dictionary.home.workSubheading}
              action={
                <Link
                  href={localePath(locale, "/work")}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-accent"
                >
                  {dictionary.home.workViewAll}
                  <ArrowUpRight className="size-4" />
                </Link>
              }
            />
            <div className="grid gap-6 md:grid-cols-3">
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
          </div>
        </section>
      ) : null}

      {posts.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <SectionHeading
            eyebrow={dictionary.blog.pageEyebrow}
            title={dictionary.home.blogHeading}
            description={dictionary.home.blogSubheading}
            action={
              <Link
                href={localePath(locale, "/blog")}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-accent"
              >
                {dictionary.home.blogViewAll}
                <ArrowUpRight className="size-4" />
              </Link>
            }
          />
          <div className="grid gap-6 md:grid-cols-3">
            {posts.map((post, index) => (
              <BlogCard
                key={post.uuid}
                post={post}
                locale={locale}
                byLabel={dictionary.blog.byAuthor}
                featuredLabel={dictionary.blog.featuredLabel}
                delayMs={index * 60}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
