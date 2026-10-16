import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BlogCard } from "@/components/blog-card";
import { RichText } from "@/components/rich-text";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getBlogPostBySlug,
  getBlogPostSlugs,
  getBlogPosts,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata, localePath } from "@/lib/seo";

type BlogDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getBlogPostSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const settings = await getSiteSettings(locale);

  try {
    const post = await getBlogPostBySlug(locale, slug);
    const image = firstAsset(post.fields["featured-image"]);
    return buildMetadata({
      settings,
      locale,
      title: post.fields["meta-title"] || post.fields.title,
      description: post.fields["meta-description"] || post.fields.excerpt,
      path: `/blog/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return buildMetadata({ settings, locale, title: "Article", path: `/blog/${slug}` });
  }
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);

  let post;
  try {
    post = await getBlogPostBySlug(locale, slug);
  } catch {
    notFound();
  }

  const allPosts = await getBlogPosts(locale);
  const related = allPosts
    .filter(
      (item) =>
        item.uuid !== post.uuid && item.fields.category?.fields?.slug === post.fields.category?.fields?.slug,
    )
    .slice(0, 3);

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const image = firstAsset(post.fields["featured-image"]);

  return (
    <>
      <div className="grid-field border-b border-border">
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <Link
            href={localePath(locale, "/blog")}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"
          >
            <ArrowLeft className="size-4" />
            {dictionary.blog.backToBlog}
          </Link>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {post.fields.category?.fields?.name ? <span>{post.fields.category.fields.name}</span> : null}
            {date ? <span>{date}</span> : null}
          </div>
          <h1 className="font-heading mt-4 text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            {post.fields.title}
          </h1>
          {post.fields.author?.fields?.name ? (
            <p className="mt-5 text-sm text-muted-foreground">
              {dictionary.blog.byAuthor} {post.fields.author.fields.name}
              {post.fields.author.fields.role ? ` · ${post.fields.author.fields.role}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {image?.url ? (
        <div className="mx-auto max-w-4xl px-6 pt-10 md:pt-14">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-secondary">
            <Image
              src={image.url}
              alt={assetAlt(image, post.fields.title || "Article")}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      <article className="mx-auto max-w-3xl px-6 py-16">
        <RichText value={post.fields.body} />
      </article>

      {related.length > 0 ? (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <h2 className="font-heading mb-10 text-3xl font-semibold md:text-4xl">
              {dictionary.blog.relatedHeading}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((item, index) => (
                <BlogCard
                  key={item.uuid}
                  post={item}
                  locale={locale}
                  byLabel={dictionary.blog.byAuthor}
                  featuredLabel={dictionary.blog.featuredLabel}
                  delayMs={index * 60}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
