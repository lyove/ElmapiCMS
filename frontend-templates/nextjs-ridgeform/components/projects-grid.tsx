"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { assetAlt, enumValue, firstAsset } from "@/lib/assets";
import type { ContentEntry, ProjectFields } from "@/lib/types";

type ProjectsGridProps = {
  projects: ContentEntry<ProjectFields>[];
};

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const filters = useMemo(() => {
    const types = new Set<string>();
    for (const project of projects) {
      const type = enumValue(project.fields["project-type"]);
      if (type) types.add(type);
    }
    return ["All", ...Array.from(types)];
  }, [projects]);

  const [active, setActive] = useState("All");

  const visible = projects.filter((project) => {
    if (active === "All") return true;
    return enumValue(project.fields["project-type"]) === active;
  });

  return (
    <>
      <PageIntro
        title="Always dedicated and devoted"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Project Grid" },
        ]}
      />

      <section className="dot-bg py-16 md:py-20">
        <div className="site-shell">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActive(filter)}
                className={
                  active === filter
                    ? "bg-safety px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink"
                    : "bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink hover:bg-safety"
                }
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((project, index) => {
              const image = firstAsset(project.fields["hero-image"]);
              return (
                <Reveal key={project.uuid} delay={index * 60}>
                  <article className="group border border-border bg-white">
                    <Link href={`/projects/${project.fields.slug}`} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {image?.url ? (
                          <Image
                            src={image.url}
                            alt={assetAlt(image, project.fields.title || "Project")}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width:768px) 100vw, 33vw"
                          />
                        ) : null}
                      </div>
                      <div className="p-5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-safety">
                          {enumValue(project.fields["project-type"]) ||
                            project.fields.location}
                        </p>
                        <h2 className="font-heading mt-2 text-xl font-bold uppercase group-hover:text-safety">
                          {project.fields.title}
                        </h2>
                        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                          {project.fields.summary}
                        </p>
                        <span className="mt-4 inline-block text-xs font-bold uppercase tracking-wider">
                          Read More
                        </span>
                      </div>
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
