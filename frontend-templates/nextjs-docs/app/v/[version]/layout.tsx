import { notFound } from "next/navigation";
import { NotFoundError } from "@elmapicms/js-sdk";
import { DocsShell } from "@/components/docs-shell";
import {
  getDocsNav,
  getSearchIndex,
  getSiteSettings,
  getVersionBySlug,
  getVersions,
} from "@/lib/content";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
};

export default async function VersionLayout({ children, params }: LayoutProps) {
  const { version: versionSlug } = await params;

  try {
    const [settings, version, versions, nav, searchItems] = await Promise.all([
      getSiteSettings(),
      getVersionBySlug(versionSlug),
      getVersions(),
      getDocsNav(versionSlug),
      getSearchIndex(versionSlug),
    ]);

    void version;

    return (
      <DocsShell
        siteName={settings.fields["site-name"] || "Docs"}
        versionSlug={versionSlug}
        versions={versions}
        nav={nav}
        searchItems={searchItems}
      >
        {children}
      </DocsShell>
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
