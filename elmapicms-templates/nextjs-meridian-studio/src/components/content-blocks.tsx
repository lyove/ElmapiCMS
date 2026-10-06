import Link from "next/link";
import Image from "next/image";
import { Code, Film, Megaphone, Palette, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ContentEntry, ServiceFields } from "@/lib/types";

const iconMap: Record<string, LucideIcon> = {
  palette: Palette,
  code: Code,
  megaphone: Megaphone,
  film: Film,
};

type ServicesGridProps = {
  services: ContentEntry<ServiceFields>[];
  compact?: boolean;
};

export function ServicesGrid({ services, compact = false }: ServicesGridProps) {
  return (
    <div className={`grid gap-6 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"}`}>
      {services.map((service) => {
        const Icon = iconMap[service.fields.icon ?? ""] ?? Sparkles;
        return (
          <article
            key={service.uuid}
            className="group rounded-2xl border border-border/50 bg-card/40 p-6 transition-colors hover:border-primary/30 hover:bg-card/70"
          >
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
              <Icon className="size-5" aria-hidden />
            </div>
            <h3 className="font-heading text-lg font-semibold">{service.fields.title}</h3>
            {!compact && service.fields.description ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {service.fields.description}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

type WorkCardProps = {
  title?: string;
  slug?: string;
  excerpt?: string;
  client?: string;
  industry?: string;
  imageUrl?: string | null;
  imageAlt?: string;
};

export function WorkCard({
  title,
  slug,
  excerpt,
  client,
  industry,
  imageUrl,
  imageAlt,
}: WorkCardProps) {
  if (!slug) return null;

  return (
    <Link
      href={`/work/${slug}`}
      className="group block overflow-hidden rounded-2xl border border-border/50 bg-card/30 transition hover:border-primary/25"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt || title || "Case study"}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-card" />
        )}
      </div>
      <div className="space-y-2 p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          {client ? <span>{client}</span> : null}
          {client && industry ? <span aria-hidden>·</span> : null}
          {industry ? <span>{industry}</span> : null}
        </div>
        <h3 className="font-heading text-xl font-semibold group-hover:text-primary">{title}</h3>
        {excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}
