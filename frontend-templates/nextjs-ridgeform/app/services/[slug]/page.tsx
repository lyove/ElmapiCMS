import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundError } from "@elmapicms/js-sdk";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { RichText } from "@/components/rich-text";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getProjects,
  getServiceBySlug,
  getServices,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const services = await getServices();
  return services
    .map((entry) => entry.fields.slug)
    .filter(Boolean)
    .map((slug) => ({ slug: slug as string }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getSiteSettings();
  try {
    const service = await getServiceBySlug(slug);
    const image = firstAsset(service.fields.image);
    return buildMetadata({
      settings,
      title: service.fields["meta-title"] || service.fields.title,
      description: service.fields["meta-description"] || service.fields.summary,
      path: `/services/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return buildMetadata({ settings, title: "Service", path: `/services/${slug}` });
  }
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  let service;
  try {
    service = await getServiceBySlug(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const [allServices, allProjects] = await Promise.all([
    getServices(),
    getProjects(),
  ]);

  const image = firstAsset(service.fields.image);
  const otherServices = allServices.filter((entry) => entry.uuid !== service.uuid);
  const benefits = (service.fields.benefits ?? [])
    .map((item) => item.label?.trim())
    .filter((label): label is string => Boolean(label));
  const relatedProjects = allProjects
    .filter((project) =>
      (project.fields["related-services"] ?? []).some(
        (related) => related.uuid === service.uuid,
      ),
    )
    .slice(0, 3);

  return (
    <article>
      <PageIntro
        title={service.fields.title || "Service"}
        description={service.fields.summary}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.fields.title || "Detail" },
        ]}
      />

      <section className="dot-bg py-14 md:py-20">
        <div className="site-shell grid items-start gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            {image?.url ? (
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                  src={image.url}
                  alt={assetAlt(image, service.fields.title || "Service")}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 58vw"
                  priority
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-ink text-white">
                <span className="font-heading text-6xl font-extrabold text-safety/80">
                  {(service.fields["icon-label"] || service.fields.title || "RF").slice(0, 2)}
                </span>
              </div>
            )}
          </Reveal>

          <Reveal className="lg:col-span-5" delay={80}>
            <span className="section-label">
              {service.fields["icon-label"] || "Service"}
            </span>
            <h2 className="font-heading mt-4 text-2xl font-extrabold uppercase md:text-3xl">
              {service.fields.title}
            </h2>
            {service.fields.summary ? (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {service.fields.summary}
              </p>
            ) : null}

            {benefits.length > 0 ? (
              <div className="mt-8 space-y-3 border-t border-border pt-6">
                {benefits.map((item) => (
                  <p
                    key={item}
                    className="flex items-start gap-3 text-sm font-semibold uppercase tracking-wide"
                  >
                    <span className="mt-1.5 size-2 shrink-0 bg-safety" />
                    {item}
                  </p>
                ))}
              </div>
            ) : null}

            <Link href="/contact" className="btn-cta btn-cta-brand mt-8">
              Start an inquiry
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="site-shell grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <span className="section-label">Overview</span>
            <div className="mt-6">
              <RichText value={service.fields.body} />
            </div>
          </Reveal>

          <aside className="space-y-6 lg:col-span-4">
            <Reveal delay={60}>
              <div className="border border-border bg-smoke p-6">
                <p className="font-heading text-lg font-bold uppercase">
                  Next step
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Tell us about your site, drawings, and timing. We will confirm
                  fit and schedule a discovery call.
                </p>
                <Link href="/contact" className="btn-cta btn-cta-brand mt-5">
                  Request a consult
                </Link>
              </div>
            </Reveal>

            {otherServices.length > 0 ? (
              <Reveal delay={100}>
                <div className="border border-border p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Other services
                  </p>
                  <ul className="mt-4 space-y-3">
                    {otherServices.map((entry) =>
                      entry.fields.slug ? (
                        <li key={entry.uuid}>
                          <Link
                            href={`/services/${entry.fields.slug}`}
                            className="text-sm font-semibold uppercase hover:text-safety"
                          >
                            {entry.fields.title}
                          </Link>
                          {entry.fields.summary ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {entry.fields.summary}
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

      {relatedProjects.length > 0 ? (
        <section className="bg-smoke py-16 md:py-20">
          <div className="site-shell">
            <Reveal>
              <span className="section-label">Related work</span>
              <h2 className="font-heading mt-4 text-3xl font-extrabold uppercase">
                Projects that used this service
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProjects.map((project, index) => {
                const hero = firstAsset(project.fields["hero-image"]);
                return (
                  <Reveal key={project.uuid} delay={index * 60}>
                    <Link
                      href={`/projects/${project.fields.slug}`}
                      className="group block overflow-hidden border border-border bg-white"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {hero?.url ? (
                          <Image
                            src={hero.url}
                            alt={assetAlt(hero, project.fields.title || "Project")}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width:768px) 100vw, 33vw"
                          />
                        ) : null}
                      </div>
                      <div className="p-5">
                        <h3 className="font-heading text-lg font-bold uppercase group-hover:text-safety">
                          {project.fields.title}
                        </h3>
                        {project.fields.location ? (
                          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {project.fields.location}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-ink py-12 text-white">
        <div className="site-shell flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Ready when you are
            </p>
            <p className="font-heading mt-2 text-2xl font-extrabold uppercase md:text-3xl">
              Talk through your scope with Ridgeform
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/services"
              className="btn-cta border border-white/40 text-white hover:bg-white hover:text-ink"
            >
              All services
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
