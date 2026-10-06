import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@elmapicms/js-sdk";
import { ArrowRight } from "lucide-react";
import {
  getCategoryBySlug,
  getDocsNav,
  getSiteSettings,
  getVersions,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ version: string; slug: string }>;
};

export async function generateStaticParams() {
  try {
    const versions = await getVersions();
    const params: { version: string; slug: string }[] = [];
    for (const version of versions) {
      if (!version.fields.slug) continue;
      const nav = await getDocsNav(version.fields.slug);
      for (const category of nav) {
        params.push({
          version: version.fields.slug,
          slug: category.slug,
        });
      }
    }
    return params;
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { version, slug } = await params;
  try {
    const [settings, category] = await Promise.all([
      getSiteSettings(),
      getCategoryBySlug(slug),
    ]);
    return buildMetadata({
      settings,
      path: `/v/${version}/category/${slug}`,
      title: category.fields.title,
      description: category.fields.description || undefined,
    });
  } catch {
    return { title: "Category not found" };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { version, slug } = await params;

  try {
    const [category, nav] = await Promise.all([
      getCategoryBySlug(slug),
      getDocsNav(version),
    ]);
    const section = nav.find((item) => item.slug === slug);

    if (!section) notFound();

    return (
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium text-docs-primary">Category</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem] sm:leading-[1.2]">
            {category.fields.title || "Untitled"}
          </h1>
          {category.fields.description ? (
            <p className="max-w-2xl text-[15.5px] leading-7 text-muted-foreground">
              {category.fields.description}
            </p>
          ) : null}
        </header>

        <ul className="space-y-0.5">
          {section.articles.map((article) => (
            <li key={article.uuid}>
              <Link
                href={`/v/${version}/${article.slug}`}
                className="group flex items-start justify-between gap-4 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-accent/70"
              >
                <span>
                  <span className="block text-[15px] font-medium tracking-tight text-foreground group-hover:text-docs-primary">
                    {article.title}
                  </span>
                  {article.summary ? (
                    <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">
                      {article.summary}
                    </span>
                  ) : null}
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-docs-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
