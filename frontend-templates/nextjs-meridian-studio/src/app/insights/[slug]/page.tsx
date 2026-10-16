import { notFound } from "next/navigation";
import { NotFoundError } from "@elmapicms/js-sdk";
import { InsightDetail } from "@/components/insight-detail";
import { firstAsset } from "@/lib/assets";
import {
  getInsightBySlug,
  getInsights,
  getInsightSlugs,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getInsightSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const [settings, post] = await Promise.all([
      getSiteSettings(),
      getInsightBySlug(slug),
    ]);
    const image = firstAsset(post.fields["featured-image"]);
    return buildMetadata({
      settings,
      title: post.fields["meta-title"]?.split("|")[0]?.trim() || post.fields.title,
      description: post.fields["meta-description"] || post.fields.excerpt,
      path: `/insights/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return {};
  }
}

export default async function InsightPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const [post, insights] = await Promise.all([
      getInsightBySlug(slug),
      getInsights(),
    ]);
    const related = insights.filter((item) => item.uuid !== post.uuid).slice(0, 2);

    return <InsightDetail post={post} related={related} />;
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
