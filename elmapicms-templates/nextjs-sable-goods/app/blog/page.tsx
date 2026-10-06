import Link from "next/link";
import { BlogCard } from "@/components/blog-card";
import { getBlogPosts, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { BLOG_TOPIC_LABELS, type BlogTopic } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Blog",
    description:
      "Notes on materials, makers, studio days, and quiet styling from Sable Goods.",
    path: "/blog",
  });
}

type BlogPageProps = {
  searchParams: Promise<{ topic?: string }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { topic: topicParam } = await searchParams;
  const topic =
    topicParam && topicParam in BLOG_TOPIC_LABELS
      ? (topicParam as BlogTopic)
      : undefined;

  const [settings, posts] = await Promise.all([
    getSiteSettings(),
    getBlogPosts(topic ? { topic } : undefined),
  ]);

  const siteName = settings.fields["site-name"] || "Sable Goods";
  const topics = Object.entries(BLOG_TOPIC_LABELS) as [BlogTopic, string][];

  return (
    <div>
      <section className="border-b border-border bg-mist">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <p className="eyebrow">Blog</p>
          <h1 className="section-title mt-3">From the studio</h1>
          <p className="section-lead mt-4 max-w-xl">
            Materials, makers, and quiet rooms. Notes from {siteName} for the
            pieces you live with.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={
                !topic
                  ? "shop-cta"
                  : "inline-flex items-center px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70 transition-colors hover:text-ink"
              }
            >
              All
            </Link>
            {topics.map(([value, label]) => (
              <Link
                key={value}
                href={`/blog?topic=${value}`}
                className={
                  topic === value
                    ? "shop-cta"
                    : "inline-flex items-center px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70 transition-colors hover:text-ink"
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        {posts.length > 0 ? (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.uuid} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-stone">No posts in this topic yet.</p>
        )}
      </section>
    </div>
  );
}
