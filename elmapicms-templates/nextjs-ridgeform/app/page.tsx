import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { RichText } from "@/components/rich-text";
import { SectionHeading } from "@/components/page-intro";
import { ContactForm } from "@/components/contact-form";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getHomePage,
  getSiteSettings,
  getTestimonials,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, home] = await Promise.all([getSiteSettings(), getHomePage()]);
  const hero = firstAsset(home.fields["hero-image"]);
  return buildMetadata({
    settings,
    title: home.fields["meta-title"] || undefined,
    description: home.fields["meta-description"],
    path: "/",
    imageUrl: hero?.url,
  });
}

export default async function HomePage() {
  const [home, settings, testimonials] = await Promise.all([
    getHomePage(),
    getSiteSettings(),
    getTestimonials(),
  ]);

  const hero = firstAsset(home.fields["hero-image"]);
  const featuredServices = home.fields["featured-services"] ?? [];
  const featuredProjects = home.fields["featured-projects"] ?? [];
  const stats = home.fields["trust-stats"] ?? [];
  const topServices = featuredServices.slice(0, 3);
  const showUtilityBar = settings.fields["show-utility-bar"] !== false;
  const heroMinHeight = showUtilityBar
    ? "min-h-[calc(100dvh-6.75rem)]"
    : "min-h-[calc(100dvh-4.5rem)]";

  return (
    <>
      {/* Hero — full viewport below sticky header */}
      <section className={`relative flex overflow-hidden bg-ink ${heroMinHeight}`}>
        {hero?.url ? (
          <Image
            src={hero.url}
            alt={assetAlt(hero, "Ridgeform completed home")}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-ink/15" />

        <div className="site-shell relative flex w-full flex-1 items-center py-20">
          <div className="motion-rise max-w-xl text-white">
            <h1 className="font-heading text-3xl font-extrabold uppercase leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
              {home.fields["hero-headline"] || "We build your dream"}
            </h1>
            {home.fields["hero-eyebrow"] ? (
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-safety">
                {home.fields["hero-eyebrow"]}
              </p>
            ) : null}
            <p className="mt-4 text-sm leading-relaxed text-white/80 md:text-base">
              {home.fields["hero-subhead"]}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {home.fields["hero-cta-href"] && home.fields["hero-cta-label"] ? (
                <Link
                  href={home.fields["hero-cta-href"]}
                  className="btn-cta btn-cta-brand"
                >
                  {home.fields["hero-cta-label"]}
                </Link>
              ) : null}
              {home.fields["hero-secondary-cta-href"] &&
              home.fields["hero-secondary-cta-label"] ? (
                <Link
                  href={home.fields["hero-secondary-cta-href"]}
                  className="btn-cta border border-white bg-transparent text-white hover:border-safety hover:bg-safety hover:text-ink"
                >
                  {home.fields["hero-secondary-cta-label"]}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Service highlight strip under hero */}
      {topServices.length > 0 ? (
        <section className="relative z-10">
          <div className="site-shell grid gap-0 md:grid-cols-3">
            {topServices.map((service, index) => {
              const image = firstAsset(service.fields.image);
              return (
                <Link
                  key={service.uuid}
                  href={`/services/${service.fields.slug}`}
                  className="group relative block overflow-hidden bg-ink text-white"
                >
                  {image?.url ? (
                    <Image
                      src={image.url}
                      alt={assetAlt(image, service.fields.title || "Service")}
                      fill
                      className="object-cover opacity-40 transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  ) : null}
                  <div className="relative flex min-h-[220px] flex-col justify-end p-6 md:min-h-[260px] md:p-8">
                    <span className="font-heading text-5xl font-extrabold text-safety/80">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-heading mt-2 text-xl font-bold uppercase">
                      {service.fields.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-white/70">
                      {service.fields.summary}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-safety transition-all duration-300 group-hover:w-full" />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* About / value prop */}
      <section className="dot-bg py-20 md:py-28">
        <div className="site-shell grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <span className="section-label">Welcome</span>
            <h2 className="font-heading mt-4 text-3xl font-extrabold uppercase leading-tight md:text-4xl">
              {home.fields["value-prop-title"] || "About Company"}
            </h2>
            <div className="mt-6">
              <RichText value={home.fields["value-prop-body"]} />
            </div>
            <Link href="/about" className="btn-cta btn-cta-dark mt-8">
              Read More
            </Link>
          </Reveal>
          <Reveal delay={100}>
            <div className="relative">
              {hero?.url ? (
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={hero.url}
                    alt={assetAlt(hero, "Ridgeform crew")}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 50vw"
                  />
                </div>
              ) : null}
              <div className="absolute -bottom-6 -left-6 hidden bg-safety p-6 text-ink md:block">
                <p className="font-heading text-4xl font-extrabold">
                  {settings.fields["years-label"]?.match(/\d+/)?.[0] || "18"}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider">
                  Years Experience
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      {stats.length > 0 ? (
        <section className="bg-ink py-14 text-white">
          <div className="site-shell grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="text-center">
                <p className="font-heading text-4xl font-extrabold text-safety md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-white/70">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Mission + inquiry */}
      <section className="py-20 md:py-28">
        <div className="site-shell grid gap-10 md:grid-cols-12">
          <Reveal className="md:col-span-7">
            <span className="section-label">Mission</span>
            <h2 className="font-heading mt-4 text-3xl font-extrabold uppercase md:text-4xl">
              {home.fields["certifications-title"] || "Credentials that matter on site"}
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              {home.fields["certifications-body"] ||
                settings.fields["default-meta-description"]}
            </p>
            <ul className="mt-8 space-y-3">
              {featuredServices.slice(0, 5).map((service) => (
                <li key={service.uuid}>
                  <Link
                    href={`/services/${service.fields.slug}`}
                    className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide hover:text-safety"
                  >
                    <span className="size-2 bg-safety" />
                    {service.fields.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/services" className="btn-cta btn-cta-dark mt-8">
              Read More
            </Link>
          </Reveal>
          <Reveal className="bg-smoke p-6 md:col-span-5 md:p-8" delay={80}>
            <h3 className="font-heading text-xl font-bold uppercase">Get In Touch</h3>
            <p className="mt-2 mb-6 text-sm text-muted-foreground">
              Tell us about your build, remodel, or light commercial job.
            </p>
            <ContactForm submitLabel="Submit Now" />
          </Reveal>
        </div>
      </section>

      {/* Numbered services */}
      <section className="dot-bg border-y border-border py-20 md:py-28">
        <div className="site-shell">
          <Reveal>
            <SectionHeading
              eyebrow="Services"
              title={home.fields["services-section-title"] || "Our Services"}
              description="Residential and light commercial work with one accountable GC team."
            />
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredServices.slice(0, 4).map((service, index) => (
              <Reveal key={service.uuid} delay={index * 70}>
                <Link
                  href={`/services/${service.fields.slug}`}
                  className="group block border border-border bg-white p-6 transition-shadow hover:shadow-lg"
                >
                  <span className="font-heading text-5xl font-extrabold text-smoke group-hover:text-safety">
                    {index + 1}
                  </span>
                  <h3 className="font-heading mt-4 text-lg font-bold uppercase leading-snug">
                    {service.fields.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                    {service.fields.summary}
                  </p>
                  <span className="mt-5 inline-block text-xs font-bold uppercase tracking-wider text-ink group-hover:text-safety">
                    Read More
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Yellow CTA band */}
      <section className="bg-safety text-ink">
        <div className="site-shell flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink/70">
              Let&apos;s work together
            </p>
            <a
              href={
                settings.fields.phone
                  ? `tel:${settings.fields.phone.replace(/\D/g, "")}`
                  : "/contact"
              }
              className="font-heading mt-2 block text-3xl font-extrabold md:text-4xl"
            >
              {settings.fields.phone || "Start a project"}
            </a>
            {settings.fields.address ? (
              <p className="mt-2 text-sm text-ink/75">
                {settings.fields.address.split("\n").join(", ")}
              </p>
            ) : null}
          </div>
          <Link href="/contact" className="btn-cta btn-cta-dark">
            Contact Us
          </Link>
        </div>
      </section>

      {/* Projects */}
      <section className="py-20 md:py-28">
        <div className="site-shell">
          <Reveal>
            <SectionHeading
              eyebrow="Projects"
              title={home.fields["projects-section-title"] || "Our Project"}
            />
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project, index) => {
              const image = firstAsset(project.fields["hero-image"]);
              return (
                <Reveal key={project.uuid} delay={index * 80}>
                  <Link
                    href={`/projects/${project.fields.slug}`}
                    className="group relative block overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] bg-muted">
                      {image?.url ? (
                        <Image
                          src={image.url}
                          alt={assetAlt(image, project.fields.title || "Project")}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width:768px) 100vw, 33vw"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/55" />
                      <div className="absolute inset-x-0 bottom-0 translate-y-2 p-5 opacity-100 transition-all group-hover:translate-y-0">
                        <h3 className="font-heading text-lg font-bold uppercase text-white drop-shadow">
                          {project.fields.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-safety">
                          {project.fields.location}
                        </p>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link href="/projects" className="btn-cta btn-cta-outline">
              View All
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 ? (
        <section className="bg-smoke py-20 md:py-28">
          <div className="site-shell">
            <Reveal>
              <SectionHeading eyebrow="Clients" title="Client Testimonials" />
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((item, index) => (
                <Reveal key={item.uuid} delay={index * 70}>
                  <blockquote className="relative border border-border bg-white p-6 pt-10">
                    <span className="absolute -top-4 left-6 bg-safety px-3 py-1 font-heading text-2xl font-extrabold text-ink">
                      ”
                    </span>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.fields.quote}
                    </p>
                    <footer className="mt-5 border-t border-border pt-4">
                      <p className="font-heading text-sm font-bold uppercase">
                        {item.fields["author-name"]}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-safety">
                        {[item.fields["author-role"], item.fields.company]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                    </footer>
                  </blockquote>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Bottom CTA */}
      {(home.fields["cta-title"] || home.fields["cta-label"]) && (
        <section className="bg-ink py-16 text-white">
          <div className="site-shell flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="font-heading text-3xl font-extrabold uppercase md:text-4xl">
                {home.fields["cta-title"]}
              </h2>
              <p className="mt-3 text-white/70">{home.fields["cta-body"]}</p>
            </div>
            {home.fields["cta-href"] && home.fields["cta-label"] ? (
              <Link
                href={home.fields["cta-href"]}
                className="btn-cta btn-cta-brand"
              >
                {home.fields["cta-label"]}
              </Link>
            ) : null}
          </div>
        </section>
      )}
    </>
  );
}
