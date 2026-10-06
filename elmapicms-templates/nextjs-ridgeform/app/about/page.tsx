import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { RichText } from "@/components/rich-text";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getAboutPage,
  getServices,
  getSiteSettings,
  getTeamMembers,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSiteSettings(), getAboutPage()]);
  const image = firstAsset(page.fields.image);
  return buildMetadata({
    settings,
    title: page.fields["meta-title"] || "About",
    description: page.fields["meta-description"] || page.fields.intro,
    path: "/about",
    imageUrl: image?.url,
  });
}

export default async function AboutPage() {
  const [page, team, services, settings] = await Promise.all([
    getAboutPage(),
    getTeamMembers(),
    getServices(),
    getSiteSettings(),
  ]);
  const image = firstAsset(page.fields.image);
  const featuredServices = services.filter((service) => service.fields.featured);
  const specialization =
    featuredServices.length > 0 ? featuredServices.slice(0, 4) : services.slice(0, 4);

  return (
    <>
      <PageIntro
        title={
          page.fields.title ||
          "Creating quality urban lifestyles, building stronger communities."
        }
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
      />

      <section className="dot-bg py-20">
        <div className="site-shell grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <span className="section-label">About Company</span>
            <p className="mt-4 text-sm font-bold uppercase tracking-wider text-safety">
              {settings.fields["years-label"] || "18 Years of Experience"}
            </p>
            <h2 className="font-heading mt-3 text-3xl font-extrabold uppercase leading-tight md:text-4xl">
              Improving quality of life with an integrated unified approach.
            </h2>
            {page.fields.intro ? (
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                {page.fields.intro}
              </p>
            ) : null}
            <div className="mt-6">
              <RichText value={page.fields.body} />
            </div>
            <div className="mt-8 border-l-4 border-safety bg-white p-5">
              <p className="font-heading text-lg font-bold uppercase">
                {team[0]?.fields.name || "Ridgeform Leadership"}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {team[0]?.fields.role || "Principal / General Contractor"}
              </p>
            </div>
            <Link href="/contact" className="btn-cta btn-cta-dark mt-8">
              Get in touch
            </Link>
          </Reveal>
          {image?.url ? (
            <Reveal delay={100}>
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={image.url}
                  alt={assetAlt(image, "Ridgeform crew")}
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 100vw, 50vw"
                />
              </div>
            </Reveal>
          ) : null}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="site-shell">
          <Reveal>
            <h2 className="font-heading text-center text-3xl font-extrabold uppercase md:text-4xl">
              Our Specialization
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {specialization.map((service, index) => (
              <Reveal key={service.uuid} delay={index * 70} className="h-full">
                <Link
                  href={`/services/${service.fields.slug}`}
                  className="group flex h-full flex-col border border-border p-6 hover:border-safety"
                >
                  <span className="font-heading text-5xl font-extrabold text-smoke group-hover:text-safety">
                    {index + 1}
                  </span>
                  <h3 className="font-heading mt-4 text-lg font-bold uppercase">
                    {service.fields.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">
                    {service.fields.summary}
                  </p>
                  <span className="mt-4 inline-block text-xs font-bold uppercase tracking-wider">
                    Read More
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {team.length > 0 ? (
        <section className="bg-smoke py-20">
          <div className="site-shell">
            <Reveal>
              <h2 className="font-heading text-center text-3xl font-extrabold uppercase">
                Our Team
              </h2>
              {page.fields["team-intro"] ? (
                <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
                  {page.fields["team-intro"]}
                </p>
              ) : null}
            </Reveal>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((member, index) => {
                const photo = firstAsset(member.fields.photo);
                return (
                  <Reveal key={member.uuid} delay={index * 80}>
                    <div className="bg-white">
                      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                        {photo?.url ? (
                          <Image
                            src={photo.url}
                            alt={assetAlt(photo, member.fields.name || "Team")}
                            fill
                            className="object-cover"
                            sizes="(max-width:768px) 100vw, 33vw"
                          />
                        ) : null}
                      </div>
                      <div className="p-5 text-center">
                        <h3 className="font-heading text-lg font-bold uppercase">
                          {member.fields.name}
                        </h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-safety">
                          {member.fields.role}
                        </p>
                        {member.fields.bio ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            {member.fields.bio}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {(page.fields["safety-title"] || page.fields["safety-body"]) && (
        <section className="py-20">
          <div className="site-shell max-w-3xl">
            <Reveal>
              <span className="section-label">About Summary</span>
              <h2 className="font-heading mt-4 text-3xl font-extrabold uppercase">
                {page.fields["safety-title"]}
              </h2>
              <div className="mt-6">
                <RichText value={page.fields["safety-body"]} />
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
