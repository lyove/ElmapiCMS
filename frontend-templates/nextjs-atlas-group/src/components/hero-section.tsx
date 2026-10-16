import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/reveal";
import type { Locale } from "@/i18n/config";
import { assetAlt, firstAsset } from "@/lib/assets";
import { localePath } from "@/lib/seo";
import type { HomePageFields, ContentEntry } from "@/lib/types";

type HeroSectionProps = {
  home: ContentEntry<HomePageFields>;
  locale: Locale;
};

export function HeroSection({ home, locale }: HeroSectionProps) {
  const fields = home.fields;
  const stats = fields.stats ?? [];
  const heroImage = firstAsset(fields["hero-image"]);

  return (
    <section className="grid-field relative overflow-hidden border-b border-border">
      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-0 md:pt-28">
        <div className="grid items-center gap-12 pb-16 md:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <Reveal>
              {fields.eyebrow ? <p className="coord-label mb-5">{fields.eyebrow}</p> : null}
            </Reveal>
            <Reveal delayMs={80}>
              <h1 className="font-heading max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
                {fields.headline}
              </h1>
            </Reveal>
            {fields.subheadline ? (
              <Reveal delayMs={140}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  {fields.subheadline}
                </p>
              </Reveal>
            ) : null}
            <Reveal delayMs={200}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                {fields["primary-cta-label"] && fields["primary-cta-url"] ? (
                  <Link
                    href={localePath(locale, fields["primary-cta-url"])}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {fields["primary-cta-label"]}
                    <ArrowUpRight className="size-4" />
                  </Link>
                ) : null}
                {fields["secondary-cta-label"] && fields["secondary-cta-url"] ? (
                  <Link
                    href={localePath(locale, fields["secondary-cta-url"])}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {fields["secondary-cta-label"]}
                  </Link>
                ) : null}
              </div>
            </Reveal>
          </div>

          {heroImage?.url ? (
            <Reveal delayMs={120}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-secondary shadow-[0_24px_60px_-28px_rgba(30,45,80,0.45)]">
                <Image
                  src={heroImage.url}
                  alt={assetAlt(heroImage, fields.headline || "Atlas Group")}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/25 via-transparent to-accent/10" />
              </div>
            </Reveal>
          ) : null}
        </div>

        {stats.length > 0 ? (
          <Reveal delayMs={260}>
            <dl className="relative -mx-6 border-t border-border/80 bg-background/85 px-6 py-8 backdrop-blur-sm sm:grid sm:grid-cols-3 sm:gap-8 md:-mx-0 md:rounded-t-xl md:border md:border-b-0 md:border-border md:px-8">
              {stats.map((stat) => (
                <div key={`${stat.label}-${stat.value}`} className="py-3 sm:py-0">
                  <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    {stat.label}
                  </dt>
                  <dd className="font-heading mt-1 text-3xl font-semibold text-primary">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
