import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import type { Locale } from "@/i18n/config";
import { assetAlt, firstAsset } from "@/lib/assets";
import { localePath } from "@/lib/seo";
import type { CaseStudyFields, ContentEntry } from "@/lib/types";

type CaseStudyCardProps = {
  study: ContentEntry<CaseStudyFields>;
  locale: Locale;
  featuredLabel: string;
  delayMs?: number;
};

export function CaseStudyCard({
  study,
  locale,
  featuredLabel,
  delayMs = 0,
}: CaseStudyCardProps) {
  const image = firstAsset(study.fields["featured-image"]);
  const services = study.fields.services ?? [];

  return (
    <Reveal delayMs={delayMs}>
      <Link
        href={localePath(locale, `/work/${study.fields.slug}`)}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent"
      >
        {image?.url ? (
          <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-secondary">
            <Image
              src={image.url}
              alt={assetAlt(image, study.fields.title || "Case study")}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {study.fields.region ? <span>{study.fields.region}</span> : null}
            {study.fields.industry ? <span>{study.fields.industry}</span> : null}
            {study.fields.featured ? (
              <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-accent">{featuredLabel}</span>
            ) : null}
          </div>
          <p className="font-heading mt-3 text-lg font-semibold text-balance group-hover:text-accent">
            {study.fields.title}
          </p>
          {study.fields.client ? (
            <p className="mt-1 text-sm text-muted-foreground">{study.fields.client}</p>
          ) : null}
          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
            {study.fields.summary}
          </p>
          {services.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {services.slice(0, 3).map((service) => (
                <span
                  key={service.uuid}
                  className="rounded-md bg-muted px-2 py-1 font-mono text-[0.65rem] tracking-wide text-muted-foreground uppercase"
                >
                  {service.fields.title}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </Reveal>
  );
}
