import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RichText } from "@/components/rich-text";
import { assetAlt, firstAsset } from "@/lib/assets";
import { getFaqItems, getPageBySlug, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  try {
    const [settings, page] = await Promise.all([
      getSiteSettings(),
      getPageBySlug("about"),
    ]);
    const hero = firstAsset(page.fields["hero-image"]);
    return buildMetadata({
      settings,
      title: page.fields["seo-title"] || page.fields.title,
      description: page.fields["seo-description"] || page.fields.summary,
      path: "/about",
      imageUrl: hero?.url,
    });
  } catch {
    const settings = await getSiteSettings();
    return buildMetadata({ settings, title: "About", path: "/about" });
  }
}

const VALUES = [
  {
    title: "Materials first",
    body: "Clay, flax, glass, wax, and wood chosen for how they feel in the hand and age in a room.",
  },
  {
    title: "Small batches",
    body: "We work with a short list of makers. When a piece sells out, we wait for the next kiln.",
  },
  {
    title: "Honest checkout",
    body: "Account-only orders with invoice payment on fulfillment. No card theater on the site.",
  },
];

export default async function AboutPage() {
  let page;
  let settings;
  let faqs;
  try {
    [page, settings, faqs] = await Promise.all([
      getPageBySlug("about"),
      getSiteSettings(),
      getFaqItems(),
    ]);
  } catch {
    notFound();
  }

  const hero = firstAsset(page.fields["hero-image"]);
  const siteName = settings.fields["site-name"] || "Sable Goods";

  return (
    <div>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="section-title mt-3">{page.fields.title}</h1>
          {page.fields.summary ? (
            <p className="mt-5 max-w-xl text-lg leading-8 text-stone">
              {page.fields.summary}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="shop-cta">
              Shop the collection
            </Link>
            <Link href="/shipping" className="shop-cta-outline">
              Shipping and returns
            </Link>
          </div>
        </div>

        {hero?.url ? (
          <div className="relative aspect-[4/5] max-h-[520px] overflow-hidden bg-mist lg:justify-self-end lg:w-full">
            <Image
              src={hero.url}
              alt={assetAlt(hero, page.fields.title || "About Sable Goods")}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
            />
          </div>
        ) : null}
      </section>

      <section className="border-y border-border bg-mist">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-14 sm:px-8 md:grid-cols-3">
          {VALUES.map((value) => (
            <div key={value.title} className="bg-white p-7">
              <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
                {value.title}
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-stone">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="section-title">Our story</h2>
          <div className="mt-8">
            <RichText value={page.fields.body} />
          </div>
        </div>

        <aside className="space-y-6 bg-mist p-7 h-fit">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
              Visit
            </h3>
            {settings.fields["store-address"] ? (
              <p className="mt-3 whitespace-pre-line text-[14px] leading-6 text-stone">
                {settings.fields["store-address"]}
              </p>
            ) : (
              <p className="mt-3 text-[14px] text-stone">
                By appointment at the studio.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
              Contact
            </h3>
            {settings.fields["contact-email"] ? (
              <a
                href={`mailto:${settings.fields["contact-email"]}`}
                className="mt-3 block text-[14px] text-ink hover:text-teal"
              >
                {settings.fields["contact-email"]}
              </a>
            ) : null}
            {settings.fields["contact-phone"] ? (
              <p className="mt-1 text-[14px] text-stone">
                {settings.fields["contact-phone"]}
              </p>
            ) : null}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
              Payment
            </h3>
            <p className="mt-3 text-[14px] leading-6 text-stone">
              {settings.fields["payment-note"] ||
                `${siteName} uses account checkout with invoice payment on fulfillment.`}
            </p>
          </div>
        </aside>
      </section>

      {faqs.length > 0 ? (
        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
            <h2 className="section-title text-center">Common questions</h2>
            <ul className="mt-10 divide-y divide-border border-y border-border">
              {faqs.slice(0, 4).map((faq) => (
                <li key={faq.uuid} className="py-6">
                  <h3 className="font-heading text-base font-bold text-ink">
                    {faq.fields.question}
                  </h3>
                  <div className="mt-3 text-[14px] leading-6 text-stone [&_p]:m-0">
                    <RichText value={faq.fields.answer} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 text-center">
              <Link
                href="/faq"
                className="text-sm font-semibold text-ink underline-offset-4 hover:text-teal hover:underline"
              >
                Read all FAQs
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
