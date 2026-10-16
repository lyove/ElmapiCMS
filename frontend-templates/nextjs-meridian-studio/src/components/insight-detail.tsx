import Image from "next/image";
import Link from "next/link";
import { assetAlt, firstAsset } from "@/lib/assets";
import type { ContentEntry, InsightFields } from "@/lib/types";
import { RichText } from "@/components/rich-text";
import { InsightCard } from "@/components/team-insights";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InsightDetailProps = {
  post: ContentEntry<InsightFields>;
  related: ContentEntry<InsightFields>[];
};

function readingTimeMinutes(htmlOrText?: string): number | null {
  if (!htmlOrText?.trim()) return null;
  const text = htmlOrText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / 200));
}

export function InsightDetail({ post, related }: InsightDetailProps) {
  const image = firstAsset(post.fields["featured-image"]);
  const author = post.fields.author;
  const authorPhoto = firstAsset(author?.fields.photo);
  const minutes = readingTimeMinutes(post.fields.body);
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <article>
      <div className="mx-auto max-w-3xl px-6 pb-10 pt-16 md:pt-24">
        <Link
          href="/insights"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← All insights
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs uppercase tracking-widest text-muted-foreground">
          {post.fields.category ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              {post.fields.category}
            </span>
          ) : null}
          {date ? <span>{date}</span> : null}
          {minutes ? <span>{minutes} min read</span> : null}
        </div>
        <h1 className="font-heading mt-4 text-4xl font-semibold md:text-5xl">
          {post.fields.title}
        </h1>
        {post.fields.excerpt ? (
          <p className="mt-5 text-lg text-muted-foreground">{post.fields.excerpt}</p>
        ) : null}
        {author ? (
          <div className="mt-8 flex items-center gap-3">
            {authorPhoto ? (
              <div className="relative size-11 overflow-hidden rounded-full bg-muted">
                <Image
                  src={authorPhoto.url}
                  alt={assetAlt(authorPhoto, author.fields.name || "Author")}
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </div>
            ) : null}
            <div>
              <p className="text-sm font-medium">{author.fields.name}</p>
              {author.fields.role ? (
                <p className="text-xs text-muted-foreground">{author.fields.role}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {image ? (
        <div className="mx-auto max-w-3xl px-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
            <Image
              src={image.url}
              alt={assetAlt(image, post.fields.title || "Insight")}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        </div>
      ) : null}

      <RichText value={post.fields.body} className="mx-auto max-w-3xl px-6 py-16" />

      {author ? (
        <div className="mx-auto max-w-3xl px-6 pb-16">
          <div className="flex flex-col gap-5 rounded-2xl border border-border/50 bg-card/30 p-6 sm:flex-row sm:items-start">
            {authorPhoto ? (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
                <Image
                  src={authorPhoto.url}
                  alt={assetAlt(authorPhoto, author.fields.name || "Author")}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Author</p>
              <p className="font-heading mt-2 text-xl font-semibold">{author.fields.name}</p>
              {author.fields.role ? (
                <p className="mt-1 text-sm text-primary">{author.fields.role}</p>
              ) : null}
              {author.fields.bio ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {author.fields.bio}
                </p>
              ) : null}
              {author.fields["linkedin-url"] ? (
                <a
                  href={author.fields["linkedin-url"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  LinkedIn
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {related.length > 0 ? (
        <section className="border-t border-border/40 bg-card/20 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary">Keep reading</p>
                <h2 className="font-heading mt-2 text-3xl font-semibold">More insights</h2>
              </div>
              <Link
                href="/insights"
                className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
              >
                All insights
              </Link>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {related.map((item) => {
                const relatedImage = firstAsset(item.fields["featured-image"]);
                return (
                  <InsightCard
                    key={item.uuid}
                    title={item.fields.title}
                    slug={item.fields.slug}
                    excerpt={item.fields.excerpt}
                    category={item.fields.category}
                    authorName={item.fields.author?.fields.name}
                    publishedAt={item.published_at}
                    imageUrl={relatedImage?.url}
                  />
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
