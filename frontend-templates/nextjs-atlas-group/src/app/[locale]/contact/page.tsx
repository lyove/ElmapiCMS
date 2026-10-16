import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { FaqSection } from "@/components/faq-section";
import { PageIntro } from "@/components/page-intro";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getContactPage, getFaqs, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type ContactPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const [settings, contact] = await Promise.all([getSiteSettings(locale), getContactPage(locale)]);

  return buildMetadata({
    settings,
    locale,
    title: contact.fields["meta-title"] || contact.fields.heading,
    description: contact.fields["meta-description"] || contact.fields.intro,
    path: "/contact",
  });
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);

  const [contact, faqs, settings] = await Promise.all([
    getContactPage(locale),
    getFaqs(locale),
    getSiteSettings(locale),
  ]);

  return (
    <>
      <PageIntro
        eyebrow={dictionary.contact.pageEyebrow}
        title={contact.fields.heading || ""}
        description={contact.fields.intro}
      />
      <div className="mx-auto grid max-w-6xl items-start gap-16 px-6 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
        <ContactForm
          locale={locale}
          nameLabel={contact.fields["form-name-label"] || "Name"}
          emailLabel={contact.fields["form-email-label"] || "Email"}
          messageLabel={contact.fields["form-message-label"] || "Message"}
          submitLabel={contact.fields["form-submit-label"] || "Send message"}
          sendingLabel={dictionary.contact.sendingLabel}
          successHeading={dictionary.contact.messageSentHeading}
          successMessage={contact.fields["success-message"] || ""}
          errorMessage={contact.fields["error-message"] || ""}
        />
        <div className="space-y-10">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="coord-label">{dictionary.contact.directHeading}</p>
            {settings.fields["contact-email"] ? (
              <a
                href={`mailto:${settings.fields["contact-email"]}`}
                className="font-heading mt-3 block text-xl hover:text-accent"
              >
                {settings.fields["contact-email"]}
              </a>
            ) : null}
            {settings.fields["contact-phone"] ? (
              <p className="mt-2 text-sm text-muted-foreground">{settings.fields["contact-phone"]}</p>
            ) : null}
            {settings.fields.address ? (
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {settings.fields.address}
              </p>
            ) : null}
            {contact.fields["office-hours"] ? (
              <p className="mt-4 text-sm text-muted-foreground">{contact.fields["office-hours"]}</p>
            ) : null}
          </div>
          {faqs.length > 0 ? (
            <div>
              <p className="font-heading mb-2 text-xl font-semibold">{dictionary.contact.faqHeading}</p>
              <FaqSection faqs={faqs} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
