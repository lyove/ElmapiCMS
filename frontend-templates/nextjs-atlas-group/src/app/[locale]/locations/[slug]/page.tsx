import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3, Mail, MapPin, Phone } from "lucide-react";
import { LocationCard } from "@/components/location-card";
import { RichText } from "@/components/rich-text";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getLocationBySlug,
  getLocationSlugs,
  getLocations,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata, localePath } from "@/lib/seo";

type LocationDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getLocationSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: LocationDetailPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const settings = await getSiteSettings(locale);

  try {
    const location = await getLocationBySlug(locale, slug);
    const image = firstAsset(location.fields.image);
    return buildMetadata({
      settings,
      locale,
      title: location.fields["meta-title"] || location.fields.name,
      description: location.fields["meta-description"] || location.fields.summary,
      path: `/locations/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return buildMetadata({ settings, locale, title: "Location", path: `/locations/${slug}` });
  }
}

export default async function LocationDetailPage({ params }: LocationDetailPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);

  let location;
  try {
    location = await getLocationBySlug(locale, slug);
  } catch {
    notFound();
  }

  const image = firstAsset(location.fields.image);
  const services = location.fields.services ?? [];
  const allLocations = await getLocations(locale);
  const related = allLocations.filter((item) => item.uuid !== location.uuid).slice(0, 2);
  const place = [location.fields.city, location.fields.country].filter(Boolean).join(", ");

  return (
    <>
      <div className="grid-field border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <Link
            href={localePath(locale, "/locations")}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"
          >
            <ArrowLeft className="size-4" />
            {dictionary.locations.backToLocations}
          </Link>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {location.fields.region ? <span>{location.fields.region}</span> : null}
            {location.fields["is-headquarters"] ? (
              <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-accent">
                {dictionary.locations.headquartersLabel}
              </span>
            ) : null}
          </div>
          <h1 className="font-heading mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            {location.fields.name}
          </h1>
          {place ? <p className="mt-5 text-sm text-muted-foreground">{place}</p> : null}
          {location.fields.summary ? (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {location.fields.summary}
            </p>
          ) : null}
        </div>
      </div>

      {image?.url ? (
        <div className="mx-auto max-w-6xl px-6 pt-10 md:pt-14">
          <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border bg-secondary">
            <Image
              src={image.url}
              alt={assetAlt(image, location.fields.name || "Office")}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1152px"
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <article>
            <RichText value={location.fields.body} />
          </article>
          <aside className="h-fit rounded-xl border border-border bg-card p-6 md:p-8">
            <p className="coord-label mb-6">{dictionary.locations.contactHeading}</p>
            <dl className="space-y-5 text-sm">
              {location.fields.address ? (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                      {dictionary.locations.addressLabel}
                    </dt>
                    <dd className="mt-1 whitespace-pre-line text-foreground">
                      {location.fields.address}
                    </dd>
                  </div>
                </div>
              ) : null}
              {location.fields.phone ? (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                      {dictionary.locations.phoneLabel}
                    </dt>
                    <dd className="mt-1">
                      <a href={`tel:${location.fields.phone}`} className="hover:text-accent">
                        {location.fields.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}
              {location.fields.email ? (
                <div className="flex gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                      {dictionary.locations.emailLabel}
                    </dt>
                    <dd className="mt-1">
                      <a href={`mailto:${location.fields.email}`} className="hover:text-accent">
                        {location.fields.email}
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}
              {location.fields["office-hours"] ? (
                <div className="flex gap-3">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                      {dictionary.locations.hoursLabel}
                    </dt>
                    <dd className="mt-1 text-foreground">{location.fields["office-hours"]}</dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>
      </section>

      {services.length > 0 ? (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <h2 className="font-heading mb-8 text-3xl font-semibold md:text-4xl">
              {dictionary.locations.servicesHeading}
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
            {dictionary.locations.relatedHeading}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {related.map((item, index) => (
              <LocationCard
                key={item.uuid}
                location={item}
                locale={locale}
                headquartersLabel={dictionary.locations.headquartersLabel}
                delayMs={index * 60}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
