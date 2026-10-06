import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getContactPage,
  getFaqs,
  getSiteSettings,
} from "@/lib/content";
import { richTextToHtml } from "@/lib/rich-text";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getContactPage(),
  ]);
  return buildMetadata({
    settings,
    title: page.fields["meta-title"] || "Contact",
    description: page.fields["meta-description"] || page.fields.intro,
    path: "/contact",
  });
}

export default async function ContactPage() {
  const [page, settings, faqs] = await Promise.all([
    getContactPage(),
    getSiteSettings(),
    getFaqs(),
  ]);
  const address = settings.fields.address?.split("\n") ?? [];

  return (
    <>
      <PageIntro
        title={page.fields.title || "Start a conversation"}
        description={page.fields.intro}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Contact" },
        ]}
      />

      <section className="dot-bg py-16 md:py-20">
        <div className="site-shell grid gap-10 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <span className="section-label">Reach us</span>
            <div className="mt-6 space-y-5">
              {settings.fields.phone ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Phone
                  </p>
                  <a
                    className="font-heading mt-1 block text-2xl font-bold hover:text-safety"
                    href={`tel:${settings.fields.phone.replace(/\D/g, "")}`}
                  >
                    {settings.fields.phone}
                  </a>
                </div>
              ) : null}
              {settings.fields.email ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Email
                  </p>
                  <a
                    className="mt-1 block font-semibold hover:text-safety"
                    href={`mailto:${settings.fields.email}`}
                  >
                    {settings.fields.email}
                  </a>
                </div>
              ) : null}
              {address.length > 0 ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Address
                  </p>
                  <div className="mt-1 space-y-1 text-sm">
                    {address.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              ) : null}
              {settings.fields["service-area"] ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Service area
                  </p>
                  <p className="mt-1 text-sm">{settings.fields["service-area"]}</p>
                </div>
              ) : null}
            </div>
          </Reveal>

          <Reveal className="border border-border bg-white p-6 md:col-span-7 md:p-8" delay={80}>
            <h2 className="font-heading text-2xl font-bold uppercase">
              {page.fields["form-title"] || "Project inquiry"}
            </h2>
            {page.fields["form-intro"] ? (
              <p className="mt-2 mb-6 text-sm text-muted-foreground">
                {page.fields["form-intro"]}
              </p>
            ) : (
              <div className="mb-6" />
            )}
            <ContactForm />
          </Reveal>
        </div>
      </section>

      {faqs.length > 0 ? (
        <section className="bg-white py-20">
          <div className="site-shell max-w-3xl">
            <Reveal>
              <h2 className="font-heading text-3xl font-extrabold uppercase">
                Common questions
              </h2>
            </Reveal>
            <Accordion className="mt-8">
              {faqs.map((faq) => (
                <AccordionItem key={faq.uuid} value={faq.uuid}>
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
