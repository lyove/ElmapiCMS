import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { getProcessPage, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getProcessPage(),
  ]);
  return buildMetadata({
    settings,
    title: page.fields["meta-title"] || "Process",
    description: page.fields["meta-description"] || page.fields.intro,
    path: "/process",
  });
}

export default async function ProcessPage() {
  const page = await getProcessPage();
  const steps = page.fields.steps ?? [];

  return (
    <>
      <PageIntro
        title={page.fields.title || "How we work"}
        description={page.fields.intro}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Process" },
        ]}
      />
      <section className="dot-bg py-16 md:py-24">
        <div className="site-shell space-y-0">
          {steps.map((step, index) => (
            <Reveal key={`${step["step-number"]}-${step.title}`} delay={index * 60}>
              <div className="grid gap-4 border-b border-border bg-white/80 py-10 md:grid-cols-12 md:gap-8">
                <p className="font-heading text-4xl font-extrabold text-safety md:col-span-2">
                  {step["step-number"]}
                </p>
                <div className="md:col-span-4">
                  <h2 className="font-heading text-2xl font-bold uppercase md:text-3xl">
                    {step.title}
                  </h2>
                </div>
                <p className="text-base leading-relaxed text-muted-foreground md:col-span-6">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
