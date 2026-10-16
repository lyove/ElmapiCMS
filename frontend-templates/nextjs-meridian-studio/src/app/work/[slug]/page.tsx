import { notFound } from "next/navigation";
import { NotFoundError } from "@elmapicms/js-sdk";
import { CaseStudyDetail } from "@/components/case-study-detail";
import { firstAsset } from "@/lib/assets";
import {
  getCaseStudyBySlug,
  getCaseStudySlugs,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getCaseStudySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const [settings, study] = await Promise.all([
      getSiteSettings(),
      getCaseStudyBySlug(slug),
    ]);
    const image = firstAsset(study.fields["featured-image"]);
    return buildMetadata({
      settings,
      title: study.fields["meta-title"]?.split("|")[0]?.trim() || study.fields.title,
      description: study.fields["meta-description"] || study.fields.excerpt,
      path: `/work/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return {};
  }
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const study = await getCaseStudyBySlug(slug);
    return <CaseStudyDetail study={study} />;
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
