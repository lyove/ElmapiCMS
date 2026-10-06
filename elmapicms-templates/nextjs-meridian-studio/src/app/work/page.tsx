import { PageIntro } from "@/components/page-intro";
import { WorkCard } from "@/components/content-blocks";
import { assetAlt, firstAsset } from "@/lib/assets";
import { getCaseStudies, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Work",
    description: "Selected case studies from brand, product, and campaign engagements.",
    path: "/work",
  });
}

export default async function WorkPage() {
  const studies = await getCaseStudies();

  return (
    <>
      <PageIntro
        eyebrow="Portfolio"
        title="Work that earns attention and trust"
        description="A selection of brand, digital, and campaign projects for ambitious teams."
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 md:grid-cols-2">
        {studies.map((study) => {
          const image = firstAsset(study.fields["featured-image"]);
          return (
            <WorkCard
              key={study.uuid}
              title={study.fields.title}
              slug={study.fields.slug}
              excerpt={study.fields.excerpt}
              client={study.fields.client}
              industry={study.fields.industry}
              imageUrl={image?.url}
              imageAlt={assetAlt(image, study.fields.title || "Case study")}
            />
          );
        })}
      </div>
    </>
  );
}
