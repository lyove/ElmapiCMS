import { getContactPage, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getContactPage(),
  ]);
  return buildMetadata({
    settings,
    title: page.fields["meta-title"] || page.fields.heading || "Contact",
    description: page.fields["meta-description"] || page.fields.intro,
    path: "/contact",
  });
}

export default async function ContactPage() {
  const [page, settings] = await Promise.all([
    getContactPage(),
    getSiteSettings(),
  ]);
  const email = settings.fields["contact-email"];

  return (
    <div className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
        Contact
      </p>
      <h1 className="mt-4 max-w-3xl font-heading text-5xl font-semibold tracking-tight sm:text-7xl">
        {page.fields.heading}
      </h1>
      {page.fields.intro ? (
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{page.fields.intro}</p>
      ) : null}

      <div className="mt-14 border-l-4 border-coral bg-surface p-8 sm:p-10">
        {email ? (
          <a
            href={`mailto:${email}`}
            className="font-heading text-3xl font-semibold text-ink hover:text-coral"
          >
            {email}
          </a>
        ) : null}
        {page.fields["support-note"] ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {page.fields["support-note"]}
          </p>
        ) : null}
      </div>
    </div>
  );
}
