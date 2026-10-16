import { notFound } from "next/navigation";
import { PolicyPage } from "@/components/policy-page";
import { getPageBySlug, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  try {
    const [settings, page] = await Promise.all([
      getSiteSettings(),
      getPageBySlug("shipping"),
    ]);
    return buildMetadata({
      settings,
      title: page.fields["seo-title"] || page.fields.title,
      description: page.fields["seo-description"] || page.fields.summary,
      path: "/shipping",
    });
  } catch {
    const settings = await getSiteSettings();
    return buildMetadata({ settings, title: "Shipping", path: "/shipping" });
  }
}

export default async function ShippingPage() {
  let page;
  try {
    page = await getPageBySlug("shipping");
  } catch {
    notFound();
  }

  return <PolicyPage page={page} eyebrow="Policy" />;
}
