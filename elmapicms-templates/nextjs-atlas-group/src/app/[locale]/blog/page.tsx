import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro } from "@/components/page-intro";
import { BlogListing } from "@/components/blog-listing";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getBlogCategories, getBlogPosts, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type BlogPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);
  const settings = await getSiteSettings(locale);

  return buildMetadata({
    settings,
    locale,
    title: dictionary.blog.pageHeading,
    description: dictionary.blog.pageIntro,
    path: "/blog",
  });
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);

  const [categories, posts] = await Promise.all([
    getBlogCategories(locale),
    getBlogPosts(locale),
  ]);

  return (
    <>
      <PageIntro
        eyebrow={dictionary.blog.pageEyebrow}
        title={dictionary.blog.pageHeading}
        description={dictionary.blog.pageIntro}
      />
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Suspense fallback={null}>
          <BlogListing
            locale={locale}
            categories={categories}
            posts={posts}
            categoryAllLabel={dictionary.blog.categoryAll}
            byAuthorLabel={dictionary.blog.byAuthor}
            featuredLabel={dictionary.blog.featuredLabel}
          />
        </Suspense>
      </div>
    </>
  );
}
