"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BlogCard } from "@/components/blog-card";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/lib/seo";
import type { BlogCategoryFields, BlogPostFields, ContentEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

type BlogListingProps = {
  locale: Locale;
  categories: ContentEntry<BlogCategoryFields>[];
  posts: ContentEntry<BlogPostFields>[];
  categoryAllLabel: string;
  byAuthorLabel: string;
  featuredLabel: string;
};

/** Client filter so the blog page can stay static (no searchParams on the server). */
export function BlogListing({
  locale,
  categories,
  posts,
  categoryAllLabel,
  byAuthorLabel,
  featuredLabel,
}: BlogListingProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? undefined;
  const filtered = category
    ? posts.filter((post) => post.fields.category?.fields?.slug === category)
    : posts;

  return (
    <>
      {categories.length > 0 ? (
        <div className="mb-10 flex flex-wrap gap-2">
          <Link
            href={localePath(locale, "/blog")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              !category
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {categoryAllLabel}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.uuid}
              href={`${localePath(locale, "/blog")}?category=${cat.fields.slug}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                category === cat.fields.slug
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {cat.fields.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post, index) => (
          <BlogCard
            key={post.uuid}
            post={post}
            locale={locale}
            byLabel={byAuthorLabel}
            featuredLabel={featuredLabel}
            delayMs={index * 50}
          />
        ))}
      </div>
    </>
  );
}
