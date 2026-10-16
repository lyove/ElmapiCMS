import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { assetAlt, firstAsset } from "@/lib/assets";
import { getFaqs, getServices, getSiteSettings } from "@/lib/content";
import { richTextToHtml } from "@/lib/rich-text";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Services",
    description:
      "General contracting, renovation, additions, light commercial, and preconstruction from Ridgeform.",
    path: "/services",
  });
}

export default async function ServicesPage() {
  const [services, settings, faqs] = await Promise.all([
    getServices(),
    getSiteSettings(),
    getFaqs(),
  ]);

  return (
    <>
      <PageIntro
        title="Diversified services. Unvarying quality."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Services" },
        ]}
      />

      <section className="dot-bg py-16 md:py-20">
        <div className="site-shell grid gap-10 md:grid-cols-2 md:items-center">
          <Reveal>
            <h2 className="font-heading text-3xl font-extrabold uppercase md:text-4xl">
              In our work we have pride, quality is what we provide.
            </h2>
            <p className="mt-5 text-muted-foreground">
              {settings.fields["default-meta-description"]}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <p className="text-sm font-bold uppercase tracking-wider">
                Call For a Quote:
              </p>
              {settings.fields.phone ? (
                <a
                  href={`tel:${settings.fields.phone.replace(/\D/g, "")}`}
                  className="font-heading text-2xl font-extrabold text-safety"
                >
                  {settings.fields.phone}
                </a>
              ) : null}
            </div>
            <Link href="/contact" className="btn-cta btn-cta-brand mt-6">
              Online Estimate Form
            </Link>
          </Reveal>
          <Reveal delay={80}>
            <div className="grid gap-4">
              {services.slice(0, 3).map((service) => (
                <div
                  key={service.uuid}
                  className="border border-border bg-white p-5"
                >
                  <h3 className="font-heading text-base font-bold uppercase">
                    {service.fields.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {service.fields.summary}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="site-shell">
          <Reveal>
            <h2 className="font-heading text-center text-3xl font-extrabold uppercase">
              All Services
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => {
              const image = firstAsset(service.fields.image);
              return (
                <Reveal key={service.uuid} delay={index * 50}>
                  <Link
                    href={`/services/${service.fields.slug}`}
                    className="group block border border-border bg-smoke/40 transition-colors hover:border-safety"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {image?.url ? (
                        <Image
                          src={image.url}
                          alt={assetAlt(image, service.fields.title || "Service")}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width:768px) 100vw, 33vw"
                        />
                      ) : null}
                    </div>
                    <div className="p-5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-safety">
                        {service.fields["icon-label"]}
                      </p>
                      <h3 className="font-heading mt-2 text-xl font-bold uppercase group-hover:text-safety">
                        {service.fields.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                        {service.fields.summary}
                      </p>
                      <span className="mt-4 inline-block text-xs font-bold uppercase tracking-wider">
                        Read More
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-safety text-ink">
        <div className="site-shell flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
          <div>
            <h2 className="font-heading text-2xl font-extrabold uppercase md:text-3xl">
              Let&apos;s help you!
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink/75">
              Share drawings, photos, or a rough scope. We will tell you if we
              are the right fit.
            </p>
          </div>
          <Link href="/contact" className="btn-cta btn-cta-dark">
            Contact Us
          </Link>
        </div>
      </section>

      {faqs.length > 0 ? (
        <section className="py-20">
          <div className="site-shell max-w-3xl">
            <Reveal>
              <h2 className="font-heading text-3xl font-extrabold uppercase">
                Some FAQ
              </h2>
            </Reveal>
            <Accordion className="mt-8">
              {faqs.map((faq) => (
                <AccordionItem key={faq.uuid} value={faq.uuid} className="border-border">
                  <AccordionTrigger className="font-heading text-left text-base font-bold uppercase">
                    {faq.fields.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div
                      className="rich-text text-sm"
                      dangerouslySetInnerHTML={{
                        __html: richTextToHtml(faq.fields.answer),
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      ) : null}
    </>
  );
}
