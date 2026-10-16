import { notFound } from "next/navigation";
import { PolicyPage } from "@/components/policy-page";
import { getPageBySlug, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  try {
    const [settings, page] = await Promise.all([
      getSiteSettings(),
      getPageBySlug("privacy"),
    ]);
    return buildMetadata({
      settings,
      title: page.fields["seo-title"] || page.fields.title,
      description: page.fields["seo-description"] || page.fields.summary,
      path: "/privacy",
    });
  } catch {
    const settings = await getSiteSettings();
    return buildMetadata({
      settings,
      title: "Privacy Policy",
      path: "/privacy",
    });
  }
}

export default async function PrivacyPage() {
  let page;
  try {
    page = await getPageBySlug("privacy");
  } catch {
    notFound();
  }

  return <PolicyPage page={page} eyebrow="Legal" />;
}
