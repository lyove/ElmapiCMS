import Link from "next/link";
import { Code, Film, Megaphone, Palette, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CaseStudyFields, ContentEntry, ServiceFields } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  palette: Palette,
  code: Code,
  megaphone: Megaphone,
  film: Film,
};

type ServicesListProps = {
  services: ContentEntry<ServiceFields>[];
  caseStudies: ContentEntry<CaseStudyFields>[];
};

export function ServicesList({ services, caseStudies }: ServicesListProps) {
  return (
    <div className="space-y-6">
      {services.map((service, index) => {
        const Icon = iconMap[service.fields.icon ?? ""] ?? Sparkles;
        const deliverables = (service.fields.deliverables ?? []).filter((item) =>
          item.label?.trim(),
        );
        const related = caseStudies
          .filter((study) =>
            (study.fields.services ?? []).some((item) => item.uuid === service.uuid),
          )
          .slice(0, 2);
        const number = String(index + 1).padStart(2, "0");

        return (
          <article
            key={service.uuid}
            className="rounded-2xl border border-border/50 bg-card/30 px-6 py-8 md:px-10 md:py-10"
          >
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
              <div>
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest text-primary">{number}</span>
                  <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                </div>
                <h2 className="font-heading mt-5 text-3xl font-semibold md:text-4xl">
                  {service.fields.title}
                </h2>
                {service.fields.description ? (
                  <p className="mt-3 text-lg text-muted-foreground">
                    {service.fields.description}
                  </p>
                ) : null}
                {service.fields.details ? (
                  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {service.fields.details}
                  </p>
                ) : null}
              </div>

              <div className="space-y-8">
                {deliverables.length > 0 ? (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Deliverables
                    </p>
                    <ul className="mt-4 space-y-3">
                      {deliverables.map((item) => (
                        <li
                          key={item.label}
                          className="flex gap-3 text-sm leading-relaxed text-foreground/90"
                        >
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {related.length > 0 ? (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Selected work
                    </p>
                    <ul className="mt-4 space-y-3">
                      {related.map((study) =>
                        study.fields.slug ? (
                          <li key={study.uuid}>
                            <Link
                              href={`/work/${study.fields.slug}`}
                              className="text-sm font-medium hover:text-primary"
                            >
                              {study.fields.title}
                              {study.fields.client ? (
                                <span className="ml-2 text-muted-foreground">
                                  {study.fields.client}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ) : null,
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}

      <div className="rounded-2xl border border-primary/25 bg-primary/5 px-6 py-10 md:px-10">
        <p className="text-xs uppercase tracking-widest text-primary">Next step</p>
        <h2 className="font-heading mt-3 max-w-xl text-3xl font-semibold">
          Need a capability mix tailored to your launch?
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Tell us about goals, timeline, and where your team needs support. We will reply within two
          business days.
        </p>
        <Link
          href="/contact"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full px-8")}
        >
          Start a project
        </Link>
      </div>
    </div>
  );
}
