import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import type { Locale } from "@/i18n/config";
import { assetAlt, firstAsset } from "@/lib/assets";
import { localePath } from "@/lib/seo";
import type { BlogPostFields, ContentEntry } from "@/lib/types";

type BlogCardProps = {
  post: ContentEntry<BlogPostFields>;
  locale: Locale;
  byLabel: string;
  featuredLabel: string;
  delayMs?: number;
};

export function BlogCard({ post, locale, byLabel, featuredLabel, delayMs = 0 }: BlogCardProps) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  const image = firstAsset(post.fields["featured-image"]);

  return (
    <Reveal delayMs={delayMs}>
      <Link
        href={localePath(locale, `/blog/${post.fields.slug}`)}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent"
      >
        {image?.url ? (
          <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-secondary">
            <Image
              src={image.url}
              alt={assetAlt(image, post.fields.title || "Article")}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {post.fields.category?.fields?.name ? <span>{post.fields.category.fields.name}</span> : null}
            {post.fields.featured ? (
              <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-accent">{featuredLabel}</span>
            ) : null}
          </div>
          <p className="font-heading mt-3 text-lg font-semibold text-balance group-hover:text-accent">
            {post.fields.title}
          </p>
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
            {post.fields.excerpt}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>
              {post.fields.author?.fields?.name ? `${byLabel} ${post.fields.author.fields.name}` : null}
            </span>
            {date ? <span>{date}</span> : null}
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
