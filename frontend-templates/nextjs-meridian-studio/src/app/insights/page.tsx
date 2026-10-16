import { PageIntro } from "@/components/page-intro";
import { InsightCard } from "@/components/team-insights";
import { firstAsset } from "@/lib/assets";
import { getInsights, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Insights",
    description: "Notes on brand systems, headless CMS, and purposeful motion design.",
    path: "/insights",
  });
}

export default async function InsightsPage() {
  const insights = await getInsights();

  return (
    <>
      <PageIntro
        eyebrow="Journal"
        title="Insights from the studio"
        description="Practical thinking on brand systems, digital products, and the craft of shipping."
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((post) => {
          const image = firstAsset(post.fields["featured-image"]);
          return (
            <InsightCard
              key={post.uuid}
              title={post.fields.title}
              slug={post.fields.slug}
              excerpt={post.fields.excerpt}
              category={post.fields.category}
              authorName={post.fields.author?.fields.name}
              publishedAt={post.published_at}
              imageUrl={image?.url}
            />
          );
        })}
      </div>
    </>
  );
}
