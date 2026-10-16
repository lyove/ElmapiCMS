import { notFound } from "next/navigation";
import { PolicyPage } from "@/components/policy-page";
import { getPageBySlug, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  try {
    const [settings, page] = await Promise.all([
      getSiteSettings(),
      getPageBySlug("terms"),
    ]);
    return buildMetadata({
      settings,
      title: page.fields["seo-title"] || page.fields.title,
      description: page.fields["seo-description"] || page.fields.summary,
      path: "/terms",
    });
  } catch {
    const settings = await getSiteSettings();
    return buildMetadata({
      settings,
      title: "Terms of Service",
      path: "/terms",
    });
  }
}

export default async function TermsPage() {
  let page;
  try {
    page = await getPageBySlug("terms");
  } catch {
    notFound();
  }

  return <PolicyPage page={page} eyebrow="Legal" />;
}
