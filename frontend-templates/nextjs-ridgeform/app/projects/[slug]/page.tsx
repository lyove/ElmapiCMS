import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundError } from "@elmapicms/js-sdk";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { RichText } from "@/components/rich-text";
import { assetAlt, assetList, enumValue, firstAsset } from "@/lib/assets";
import { getProjectBySlug, getProjects, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects
    .map((entry) => entry.fields.slug)
    .filter(Boolean)
    .map((slug) => ({ slug: slug as string }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getSiteSettings();
  try {
    const project = await getProjectBySlug(slug);
    const image = firstAsset(project.fields["hero-image"]);
    return buildMetadata({
      settings,
      title: project.fields["meta-title"] || project.fields.title,
      description: project.fields["meta-description"] || project.fields.summary,
      path: `/projects/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return buildMetadata({ settings, title: "Project", path: `/projects/${slug}` });
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  let project;
  try {
    project = await getProjectBySlug(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const hero = firstAsset(project.fields["hero-image"]);
  const gallery = assetList(project.fields.gallery);
  const results = project.fields.results ?? [];
  const related = project.fields["related-services"] ?? [];
  const metaItems = [
    { label: "Location", value: project.fields.location },
    { label: "Year", value: project.fields.year },
    { label: "Type", value: enumValue(project.fields["project-type"]) },
    { label: "Client", value: project.fields.client },
  ].filter((item) => item.value);

  return (
    <article>
      <PageIntro
        title={project.fields.title || "Project"}
        description={project.fields.summary}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: project.fields.title || "Detail" },
        ]}
      />

      <section className="dot-bg py-14 md:py-20">
        <div className="site-shell grid items-start gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            {hero?.url ? (
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                  src={hero.url}
                  alt={assetAlt(hero, project.fields.title || "Project")}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 58vw"
                  priority
                />
              </div>
            ) : null}
          </Reveal>

          <Reveal className="lg:col-span-5" delay={80}>
            <span className="section-label">Project details</span>
            <h2 className="font-heading mt-4 text-2xl font-extrabold uppercase md:text-3xl">
              {project.fields.title}
            </h2>
            {project.fields.summary ? (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {project.fields.summary}
              </p>
            ) : null}

            {metaItems.length > 0 ? (
              <dl className="mt-8 grid grid-cols-2 gap-4">
                {metaItems.map((item) => (
                  <div key={item.label} className="border border-border bg-white p-4">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {results.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {results.map((result) => (
                  <div key={`${result.label}-${result.value}`} className="bg-ink p-4 text-white">
                    <p className="font-heading text-2xl font-extrabold text-safety">
                      {result.value}
                    </p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/65">
                      {result.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="site-shell grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <span className="section-label">Overview</span>
            <div className="mt-6">
              <RichText value={project.fields.body} />
            </div>
          </Reveal>

          <aside className="space-y-6 lg:col-span-4">
            <Reveal delay={60}>
              <div className="border border-border bg-smoke p-6">
                <p className="font-heading text-lg font-bold uppercase">
                  Start a similar project
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Share drawings, photos, or a rough scope. We will confirm fit and
                  schedule a discovery call.
                </p>
                <Link href="/contact" className="btn-cta btn-cta-brand mt-5">
                  Request a consult
                </Link>
              </div>
            </Reveal>

            {related.length > 0 ? (
              <Reveal delay={100}>
                <div className="border border-border p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Related services
                  </p>
                  <ul className="mt-4 space-y-3">
                    {related.map((service) =>
                      service.fields.slug ? (
                        <li key={service.uuid}>
                          <Link
                            href={`/services/${service.fields.slug}`}
                            className="text-sm font-semibold uppercase hover:text-safety"
                          >
                            {service.fields.title}
                          </Link>
                          {service.fields.summary ? (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {service.fields.summary}
                            </p>
                          ) : null}
                        </li>
                      ) : null,
                    )}
                  </ul>
                </div>
              </Reveal>
            ) : null}
          </aside>
        </div>
      </section>

      {gallery.length > 0 ? (
        <section className="bg-smoke py-16 md:py-20">
          <div className="site-shell">
            <Reveal>
              <span className="section-label">Gallery</span>
              <h2 className="font-heading mt-4 text-3xl font-extrabold uppercase">
                Project photos
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((asset, index) => (
                <Reveal key={asset.uuid} delay={index * 60}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <Image
                      src={asset.url}
                      alt={assetAlt(asset, project.fields.title || "Gallery image")}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-ink py-12 text-white">
        <div className="site-shell flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Next project
            </p>
            <p className="font-heading mt-2 text-2xl font-extrabold uppercase md:text-3xl">
              Ready to build with Ridgeform?
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/projects" className="btn-cta border border-white/40 text-white hover:bg-white hover:text-ink">
              All projects
            </Link>
            <Link href="/contact" className="btn-cta btn-cta-brand">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
