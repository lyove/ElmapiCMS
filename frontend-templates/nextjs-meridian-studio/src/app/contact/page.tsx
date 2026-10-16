import { PageIntro } from "@/components/page-intro";
import { ContactForm } from "@/components/contact-form";
import { FaqSection } from "@/components/faq-section";
import { getContactPage, getFaqs, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Contact",
    description: "Start a project with the studio. Tell us about your goals and timeline.",
    path: "/contact",
  });
}

export default async function ContactPage() {
  const [contact, faqs, settings] = await Promise.all([
    getContactPage(),
    getFaqs(),
    getSiteSettings(),
  ]);

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title={contact.fields.heading || "Get in touch"}
        description={contact.fields.intro}
      />
      <div className="mx-auto grid max-w-6xl items-start gap-16 px-6 pb-20 lg:grid-cols-[1.1fr_0.9fr]">
        <ContactForm
          submitLabel={contact.fields["form-submit-label"]}
          successMessage={contact.fields["success-message"]}
        />
        <div className="space-y-10">
          <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Direct</p>
            {settings.fields["contact-email"] ? (
              <a
                href={`mailto:${settings.fields["contact-email"]}`}
                className="mt-3 block font-heading text-xl hover:text-primary"
              >
                {settings.fields["contact-email"]}
              </a>
            ) : null}
            {settings.fields["contact-phone"] ? (
              <p className="mt-2 text-sm text-muted-foreground">{settings.fields["contact-phone"]}</p>
            ) : null}
            {settings.fields.address ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {settings.fields.address}
              </p>
            ) : null}
            {contact.fields["office-hours"] ? (
              <p className="mt-4 text-sm text-muted-foreground">{contact.fields["office-hours"]}</p>
            ) : null}
          </div>
          <div>
            <p className="mb-4 font-heading text-xl font-semibold">FAQ</p>
            <FaqSection faqs={faqs} />
          </div>
        </div>
      </div>
    </>
  );
}
