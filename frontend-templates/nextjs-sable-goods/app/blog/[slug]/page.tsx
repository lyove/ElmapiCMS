import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RichText } from "@/components/rich-text";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getBlogPostBySlug,
  getBlogPostSlugs,
  getSiteSettings,
} from "@/lib/content";
import { formatDate } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import {
  BLOG_TOPIC_LABELS,
  type BlogTopic,
} from "@/lib/types";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  try {
    const slugs = await getBlogPostSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const [settings, post] = await Promise.all([
      getSiteSettings(),
      getBlogPostBySlug(slug),
    ]);
    const image = firstAsset(post.fields["cover-image"]);
    return buildMetadata({
      settings,
      title: post.fields["seo-title"] || post.fields.title,
      description: post.fields["seo-description"] || post.fields.excerpt,
      path: `/blog/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return {};
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  let post;
  try {
    post = await getBlogPostBySlug(slug);
  } catch {
    notFound();
  }

  const image = firstAsset(post.fields["cover-image"]);
  const topic = post.fields.topic;
  const topicLabel =
    topic && topic in BLOG_TOPIC_LABELS
      ? BLOG_TOPIC_LABELS[topic as BlogTopic]
      : topic;
  const date = formatDate(post.published_at);

  return (
    <article>
      <header className="border-b border-border bg-mist">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
          <p className="eyebrow">
            <Link href="/blog" className="hover:text-ink">
              Blog
            </Link>
            {topicLabel ? (
              <>
                <span className="mx-2 text-stone/50">/</span>
                <Link
                  href={`/blog?topic=${topic}`}
                  className="text-teal hover:text-ink"
                >
                  {topicLabel}
                </Link>
              </>
            ) : null}
          </p>
          <h1 className="section-title mt-4">{post.fields.title}</h1>
          {post.fields.excerpt ? (
            <p className="mt-5 text-lg leading-8 text-stone">
              {post.fields.excerpt}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-medium uppercase tracking-[0.12em] text-stone">
            {post.fields["author-name"] ? (
              <span>{post.fields["author-name"]}</span>
            ) : null}
            {date ? <span>{date}</span> : null}
          </div>
        </div>
      </header>

      {image?.url ? (
        <div className="mx-auto max-w-5xl px-5 pt-10 sm:px-8">
          <div className="relative aspect-[16/9] overflow-hidden bg-mist">
            <Image
              src={image.url}
              alt={assetAlt(image, post.fields.title || "Blog post")}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 960px"
            />
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <RichText value={post.fields.body} />
        <div className="mt-12 border-t border-border pt-8">
          <Link href="/blog" className="shop-cta-outline">
            Back to blog
          </Link>
        </div>
      </div>
    </article>
  );
}
