import Image from "next/image";
import Link from "next/link";
import { assetAlt, firstAsset } from "@/lib/assets";
import type { ContentEntry, HomeHeroFields } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroSectionProps = {
  hero: ContentEntry<HomeHeroFields>;
};

export function HeroSection({ hero }: HeroSectionProps) {
  const bg = firstAsset(hero.fields["background-image"]);
  const stats = [
    { label: hero.fields["stat-1-label"], value: hero.fields["stat-1-value"] },
    { label: hero.fields["stat-2-label"], value: hero.fields["stat-2-value"] },
    { label: hero.fields["stat-3-label"], value: hero.fields["stat-3-value"] },
  ].filter((s) => s.label && s.value);

  return (
    <section className="relative overflow-hidden border-b border-border/40">
      {bg ? (
        <Image
          src={bg.url}
          alt={assetAlt(bg, "Studio hero")}
          fill
          priority
          className="hero-image object-cover opacity-25"
          sizes="100vw"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--background)_85%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.85_0.18_130_/_0.08),transparent_45%)]" />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 md:pb-28 md:pt-32">
        {hero.fields.eyebrow ? (
          <p className="hero-reveal mb-6 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            {hero.fields.eyebrow}
          </p>
        ) : null}
        <h1 className="hero-reveal hero-reveal-delay-1 font-heading max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl md:leading-[1.02]">
          {hero.fields.headline}
        </h1>
        {hero.fields.subheadline ? (
          <p className="hero-reveal hero-reveal-delay-2 mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {hero.fields.subheadline}
          </p>
        ) : null}
        <div className="hero-reveal hero-reveal-delay-3 mt-10 flex flex-wrap gap-4">
          {hero.fields["primary-cta-label"] && hero.fields["primary-cta-url"] ? (
            <Link
              href={hero.fields["primary-cta-url"]}
              className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8")}
            >
              {hero.fields["primary-cta-label"]}
            </Link>
          ) : null}
          {hero.fields["secondary-cta-label"] && hero.fields["secondary-cta-url"] ? (
            <Link
              href={hero.fields["secondary-cta-url"]}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full px-8",
              )}
            >
              {hero.fields["secondary-cta-label"]}
            </Link>
          ) : null}
        </div>
        {stats.length > 0 ? (
          <dl className="hero-reveal hero-reveal-delay-4 mt-16 grid gap-8 border-t border-border/40 pt-10 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="font-heading mt-2 text-3xl font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
