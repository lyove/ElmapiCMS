import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getDocsNav,
  getSiteSettings,
  getVersionBySlug,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ version: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { version } = await params;
  try {
    const [settings, versionEntry] = await Promise.all([
      getSiteSettings(),
      getVersionBySlug(version),
    ]);
    return buildMetadata({
      settings,
      path: `/v/${version}`,
      title: `${settings.fields["site-name"] || "Docs"} ${versionEntry.fields.label || version}`,
      description:
        versionEntry.fields.description ||
        settings.fields["seo-description"] ||
        settings.fields["home-intro"] ||
        settings.fields.tagline,
    });
  } catch {
    return { title: "Docs" };
  }
}

export default async function VersionHomePage({ params }: PageProps) {
  const { version } = await params;
  const [settings, versionEntry, nav] = await Promise.all([
    getSiteSettings(),
    getVersionBySlug(version),
    getDocsNav(version),
  ]);

  const siteName = settings.fields["site-name"] || "Docs";
  const firstArticle = nav[0]?.articles[0];

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="text-sm font-medium text-docs-primary">
          Version {versionEntry.fields.label || version}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem] sm:leading-[1.2]">
          {siteName}
        </h1>
        {settings.fields.tagline ? (
          <p className="max-w-2xl text-[15.5px] leading-7 text-muted-foreground">
            {settings.fields.tagline}
          </p>
        ) : null}
        {versionEntry.fields.description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {versionEntry.fields.description}
          </p>
        ) : null}
        {settings.fields["home-intro"] ? (
          <p className="max-w-2xl text-[15.5px] leading-7 text-foreground/90">
            {settings.fields["home-intro"]}
          </p>
        ) : null}
        {firstArticle ? (
          <div className="pt-2">
            <Link
              href={`/v/${version}/${firstArticle.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-docs-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start with {firstArticle.title}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : null}
      </header>

      <section className="space-y-10" aria-label="Browse by category">
        {nav.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            No published articles for this version yet.
          </p>
        ) : null}
        {nav.map((category) => (
          <div key={category.uuid} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                <Link
                  href={`/v/${version}/category/${category.slug}`}
                  className="text-foreground transition-colors hover:text-docs-primary"
                >
                  {category.title}
                </Link>
              </h2>
              {category.description ? (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {category.description}
                </p>
              ) : null}
            </div>
            <ul className="space-y-0.5">
              {category.articles.map((article) => (
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
        ))}
      </section>
    </div>
  );
}
