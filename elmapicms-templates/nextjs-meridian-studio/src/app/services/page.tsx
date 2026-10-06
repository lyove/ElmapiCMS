import { PageIntro } from "@/components/page-intro";
import { ServicesList } from "@/components/services-list";
import { getCaseStudies, getServices, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Services",
    description: "Brand, digital product, growth, and motion capabilities under one roof.",
    path: "/services",
  });
}

export default async function ServicesPage() {
  const [services, caseStudies] = await Promise.all([
    getServices(),
    getCaseStudies(),
  ]);

  return (
    <>
      <PageIntro
        eyebrow="Capabilities"
        title="Integrated studio capabilities"
        description="From positioning to production, we partner end-to-end or plug into your team where you need us most."
      />
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <ServicesList services={services} caseStudies={caseStudies} />
      </div>
    </>
  );
}
