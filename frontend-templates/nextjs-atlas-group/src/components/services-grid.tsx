import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/lib/seo";
import type { ContentEntry, ServiceFields } from "@/lib/types";

type ServicesGridProps = {
  services: ContentEntry<ServiceFields>[];
  locale: Locale;
};

export function ServicesGrid({ services, locale }: ServicesGridProps) {
  if (services.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {services.map((service, index) => (
        <Reveal key={service.uuid} delayMs={index * 60}>
          <Link
            href={localePath(locale, `/services/${service.fields.slug}`)}
            className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
          >
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon name={service.fields.icon} className="size-5" />
            </div>
            <p className="font-heading flex items-center gap-2 text-lg font-semibold">
              {service.fields.title}
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {service.fields.summary}
            </p>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
