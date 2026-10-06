import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import type { Locale } from "@/i18n/config";
import { assetAlt, firstAsset } from "@/lib/assets";
import { localePath } from "@/lib/seo";
import type { ContentEntry, LocationFields } from "@/lib/types";

type LocationCardProps = {
  location: ContentEntry<LocationFields>;
  locale: Locale;
  headquartersLabel: string;
  delayMs?: number;
};

export function LocationCard({
  location,
  locale,
  headquartersLabel,
  delayMs = 0,
}: LocationCardProps) {
  const image = firstAsset(location.fields.image);
  const place = [location.fields.city, location.fields.country].filter(Boolean).join(", ");

  return (
    <Reveal delayMs={delayMs}>
      <Link
        href={localePath(locale, `/locations/${location.fields.slug}`)}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent"
      >
        {image?.url ? (
          <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-secondary">
            <Image
              src={image.url}
              alt={assetAlt(image, location.fields.name || "Office")}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {location.fields.region ? <span>{location.fields.region}</span> : null}
            {location.fields["is-headquarters"] ? (
              <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-accent">
                {headquartersLabel}
              </span>
            ) : null}
          </div>
          <p className="font-heading mt-3 text-lg font-semibold text-balance group-hover:text-accent">
            {location.fields.name}
          </p>
          {place ? <p className="mt-1 text-sm text-muted-foreground">{place}</p> : null}
          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
            {location.fields.summary}
          </p>
        </div>
      </Link>
    </Reveal>
  );
}
