import Image from "next/image";
import Link from "next/link";
import { assetAlt, firstAsset } from "@/lib/assets";
import { formatDate } from "@/lib/format";
import {
  BLOG_TOPIC_LABELS,
  type BlogPostFields,
  type BlogTopic,
  type ContentEntry,
} from "@/lib/types";

function topicLabel(topic?: string): string | null {
  if (!topic) return null;
  if (topic in BLOG_TOPIC_LABELS) {
    return BLOG_TOPIC_LABELS[topic as BlogTopic];
  }
  return topic;
}

export function BlogCard({ post }: { post: ContentEntry<BlogPostFields> }) {
  const image = firstAsset(post.fields["cover-image"]);
  const slug = post.fields.slug || post.uuid;
  const topic = topicLabel(post.fields.topic);
  const date = formatDate(post.published_at);

  return (
    <article className="group">
      <Link href={`/blog/${slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-mist">
          {image?.url ? (
            <Image
              src={image.url}
              alt={assetAlt(image, post.fields.title || "Blog post")}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone">
              No image
            </div>
          )}
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
            {topic ? <span className="text-teal">{topic}</span> : null}
            {date ? <span>{date}</span> : null}
          </div>
          <h3 className="font-heading text-lg font-bold tracking-tight text-ink transition-colors group-hover:text-teal">
            {post.fields.title}
          </h3>
          {post.fields.excerpt ? (
            <p className="line-clamp-3 text-[14px] leading-6 text-stone">
              {post.fields.excerpt}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
