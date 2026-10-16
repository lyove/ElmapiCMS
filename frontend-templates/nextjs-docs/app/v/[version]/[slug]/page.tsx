import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@elmapicms/js-sdk";
import { Markdown } from "@/components/markdown";
import { PrevNext } from "@/components/prev-next";
import { TableOfContents } from "@/components/toc";
import {
  getArticleBySlug,
  getArticles,
  getDocsNav,
  getPrevNext,
  getSiteSettings,
} from "@/lib/content";
import { extractToc, normalizeMarkdown } from "@/lib/markdown";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ version: string; slug: string }>;
};

export async function generateStaticParams() {
  try {
    const articles = await getArticles();
    return articles
      .map((article) => {
        const version = article.fields.version?.fields.slug;
        const slug = article.fields.slug;
        if (!version || !slug) return null;
        // Reserved path segment used by category routes.
        if (slug === "category") return null;
        return { version, slug };
      })
      .filter((item): item is { version: string; slug: string } => Boolean(item));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { version, slug } = await params;
  try {
    const [settings, article] = await Promise.all([
      getSiteSettings(),
      getArticleBySlug(version, slug),
    ]);
    return buildMetadata({
      settings,
      path: `/v/${version}/${slug}`,
      title: article.fields["seo-title"] || article.fields.title,
      description:
        article.fields["seo-description"] ||
        article.fields.summary ||
        undefined,
    });
  } catch {
    return { title: "Article not found" };
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { version, slug } = await params;

  try {
    const [article, nav] = await Promise.all([
      getArticleBySlug(version, slug),
      getDocsNav(version),
    ]);
    const { prev, next } = getPrevNext(nav, slug);
    const category = article.fields.category;
    const body = normalizeMarkdown(article.fields.body);
    const toc = extractToc(body);

    return (
      <div className="xl:-me-4 xl:grid xl:grid-cols-[minmax(0,1fr)_12.5rem] xl:gap-12 2xl:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0">
          <header className="mb-8 space-y-3">
            {category?.fields.slug ? (
              <p className="text-sm font-medium text-docs-primary">
                <Link
                  href={`/v/${version}/category/${category.fields.slug}`}
                  className="hover:underline hover:underline-offset-4"
                >
                  {category.fields.title}
                </Link>
              </p>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem] sm:leading-[1.2]">
              {article.fields.title || "Untitled"}
            </h1>
            {article.fields.summary ? (
              <p className="max-w-2xl text-[15.5px] leading-7 text-muted-foreground">
                {article.fields.summary}
              </p>
            ) : null}
          </header>
          <Markdown value={article.fields.body} />
          <PrevNext versionSlug={version} prev={prev} next={next} />
        </article>
        <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto pt-1 xl:block">
          <TableOfContents items={toc} />
        </aside>
      </div>
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
