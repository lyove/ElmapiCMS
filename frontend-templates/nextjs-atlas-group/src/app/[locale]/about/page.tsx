import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { LocationCard } from "@/components/location-card";
import { Reveal } from "@/components/reveal";
import { PageIntro, SectionHeading } from "@/components/page-intro";
import { RichText } from "@/components/rich-text";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { assetAlt, firstAsset } from "@/lib/assets";
import { getAboutPage, getAuthors, getLocations, getSiteSettings } from "@/lib/content";
import { buildMetadata, localePath } from "@/lib/seo";

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const [settings, about] = await Promise.all([getSiteSettings(locale), getAboutPage(locale)]);
  const heroImage = firstAsset(about.fields["hero-image"]);

  return buildMetadata({
    settings,
    locale,
    title: about.fields["meta-title"] || about.fields.heading,
    description: about.fields["meta-description"],
    path: "/about",
    imageUrl: heroImage?.url,
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);

  const [about, authors, locations] = await Promise.all([
    getAboutPage(locale),
    getAuthors(),
    getLocations(locale),
  ]);
  const values = about.fields.values ?? [];
  const milestones = about.fields.milestones ?? [];
  const heroImage = firstAsset(about.fields["hero-image"]);

  return (
    <>
      <PageIntro eyebrow={dictionary.about.pageEyebrow} title={about.fields.heading || ""} />

      {heroImage?.url ? (
        <section className="mx-auto max-w-6xl px-6 pt-10 md:pt-14">
          <Reveal>
            <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border bg-secondary">
              <Image
                src={heroImage.url}
                alt={assetAlt(heroImage, about.fields.heading || "About Atlas Group")}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1152px"
                className="object-cover"
              />
            </div>
          </Reveal>
        </section>
      ) : null}

      <section className="mx-auto max-w-3xl px-6 py-16">
        <RichText value={about.fields.intro} />
      </section>

      {about.fields["mission-title"] || about.fields["mission-body"] ? (
        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto max-w-3xl px-6 py-16">
            {about.fields["mission-title"] ? (
              <h2 className="font-heading text-3xl font-semibold">{about.fields["mission-title"]}</h2>
            ) : null}
            <RichText value={about.fields["mission-body"]} className="mt-6" />
          </div>
        </section>
      ) : null}

      {values.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <h2 className="font-heading mb-10 text-3xl font-semibold md:text-4xl">
            {dictionary.about.valuesHeading}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <Reveal key={value.title} delayMs={index * 70}>
                <div className="h-full rounded-lg border border-border bg-card p-6">
                  <p className="font-mono text-xs text-accent">{String(index + 1).padStart(2, "0")}</p>
                  <p className="font-heading mt-2 text-lg font-semibold">{value.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {milestones.length > 0 ? (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
            <h2 className="font-heading mb-10 text-3xl font-semibold md:text-4xl">
              {dictionary.about.milestonesHeading}
            </h2>
            <ol className="space-y-8 border-l border-border pl-6">
              {milestones.map((milestone) => (
                <li key={milestone.year} className="relative">
                  <span className="absolute top-1 -left-[27px] size-2.5 rounded-full bg-accent" />
                  <p className="font-mono text-sm font-medium text-accent">{milestone.year}</p>
                  <p className="mt-1 text-muted-foreground">{milestone.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {locations.length > 0 ? (
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <SectionHeading
              eyebrow={dictionary.locations.pageEyebrow}
              title={dictionary.about.locationsHeading}
              description={dictionary.about.locationsSubheading}
              action={
                <Link
                  href={localePath(locale, "/locations")}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-accent"
                >
                  {dictionary.about.locationsViewAll}
                  <ArrowUpRight className="size-4" />
                </Link>
              }
            />
            <div className="grid gap-6 md:grid-cols-2">
              {locations.slice(0, 4).map((location, index) => (
                <LocationCard
                  key={location.uuid}
                  location={location}
                  locale={locale}
                  headquartersLabel={dictionary.locations.headquartersLabel}
                  delayMs={index * 60}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {authors.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <h2 className="font-heading mb-10 text-3xl font-semibold md:text-4xl">
            {about.fields["team-heading"]}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author, index) => {
              const photo = firstAsset(author.fields.photo);
              return (
                <Reveal key={author.uuid} delayMs={index * 70}>
                  <div className="rounded-lg border border-border bg-card p-6">
                    {photo?.url ? (
                      <div className="relative mb-5 size-20 overflow-hidden rounded-full border border-border bg-secondary">
                        <Image
                          src={photo.url}
                          alt={assetAlt(photo, author.fields.name || "Team member")}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    <p className="font-heading text-lg font-semibold">{author.fields.name}</p>
                    {author.fields.role ? (
                      <p className="font-mono text-xs tracking-wide text-accent uppercase">
                        {author.fields.role}
                      </p>
                    ) : null}
                    {author.fields.bio ? (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {author.fields.bio}
                      </p>
                    ) : null}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
