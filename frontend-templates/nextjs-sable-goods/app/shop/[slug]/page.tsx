import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { RichText } from "@/components/rich-text";
import { firstAsset } from "@/lib/assets";
import {
  getProductBySlug,
  getProducts,
  getSiteSettings,
  productInStock,
  productPrice,
} from "@/lib/content";
import { formatMoney } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import type {
  ContentEntry,
  ElmapiAsset,
  ProductFields,
  SiteSettingsFields,
} from "@/lib/types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const [settings, product] = await Promise.all([
      getSiteSettings(),
      getProductBySlug(slug),
    ]);
    const image = firstAsset(product.fields["primary-image"]);
    return buildMetadata({
      settings,
      title: product.fields["seo-title"] || product.fields.title,
      description:
        product.fields["seo-description"] || product.fields.summary,
      path: `/shop/${slug}`,
      imageUrl: image?.url,
    });
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  let product: ContentEntry<ProductFields>;
  let settings: ContentEntry<SiteSettingsFields>;
  let related: ContentEntry<ProductFields>[] = [];
  try {
    const [productResult, settingsResult, allProducts] = await Promise.all([
      getProductBySlug(slug),
      getSiteSettings(),
      getProducts(),
    ]);
    product = productResult;
    settings = settingsResult;

    const categoryUuid = product.fields.category?.uuid;
    related = allProducts
      .filter((item) => item.uuid !== product.uuid)
      .filter((item) =>
        categoryUuid
          ? item.fields.category?.uuid === categoryUuid
          : Boolean(item.fields.featured),
      )
      .slice(0, 4);

    if (related.length < 4) {
      const extras = allProducts
        .filter(
          (item) =>
            item.uuid !== product.uuid &&
            !related.some((r) => r.uuid === item.uuid),
        )
        .slice(0, 4 - related.length);
      related = [...related, ...extras];
    }
  } catch {
    notFound();
  }

  const currencySymbol = settings.fields["currency-symbol"] || "$";
  const price = productPrice(product);
  const compareAt = product.fields["compare-at-price"];
  const comparePrice =
    compareAt != null && compareAt !== ""
      ? typeof compareAt === "number"
        ? compareAt
        : Number(compareAt)
      : null;
  const onSale = Boolean(comparePrice && comparePrice > price);
  const savings =
    onSale && comparePrice ? Math.round(comparePrice - price) : 0;
  const inStock = productInStock(product);
  const category = product.fields.category;
  const categoryTitle = category?.fields.title;
  const categorySlug = category?.fields.slug;
  const featured = Boolean(product.fields.featured);

  const gallery: ElmapiAsset[] = [];
  const primary = firstAsset(product.fields["primary-image"]);
  if (primary) gallery.push(primary);
  const extra = product.fields.gallery;
  if (Array.isArray(extra)) {
    for (const asset of extra) {
      if (asset?.uuid && !gallery.some((item) => item.uuid === asset.uuid)) {
        gallery.push(asset as ElmapiAsset);
      }
    }
  }

  return (
    <div>
      <div className="border-b border-border bg-mist/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-5 py-4 text-[12px] text-stone sm:px-8">
          <Link href="/shop" className="transition-colors hover:text-ink">
            Shop
          </Link>
          {categoryTitle && categorySlug ? (
            <>
              <span aria-hidden>/</span>
              <Link
                href={`/shop?category=${encodeURIComponent(categorySlug)}`}
                className="transition-colors hover:text-ink"
              >
                {categoryTitle}
              </Link>
            </>
          ) : null}
          <span aria-hidden>/</span>
          <span className="text-ink">{product.fields.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 xl:gap-20">
          <div className="animate-rise">
            <ProductGallery
              images={gallery}
              title={product.fields.title || slug}
            />
          </div>

          <div className="animate-rise animate-rise-delay-1 lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-wrap items-center gap-2">
              {categoryTitle ? (
                <p className="eyebrow">{categoryTitle}</p>
              ) : null}
              {featured ? (
                <span className="border border-teal/40 bg-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">
                  Featured
                </span>
              ) : null}
              {!inStock ? (
                <span className="border border-border bg-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone">
                  Sold out
                </span>
              ) : null}
              {onSale ? (
                <span className="border border-ink/15 bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  Save {formatMoney(savings, currencySymbol)}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {product.fields.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <p className="font-heading text-2xl font-bold tabular-nums tracking-tight text-ink">
                {formatMoney(price, currencySymbol)}
              </p>
              {onSale && comparePrice ? (
                <p className="text-base tabular-nums text-stone line-through">
                  {formatMoney(comparePrice, currencySymbol)}
                </p>
              ) : null}
            </div>

            {product.fields.summary ? (
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-stone">
                {product.fields.summary}
              </p>
            ) : null}

            <div className="mt-8 border-t border-border pt-8">
              <AddToCartButton
                slug={slug}
                inStock={inStock}
                showQuantity
              />
              <p className="mt-4 text-[12px] leading-5 text-stone">
                Account checkout. Payment is invoiced on fulfillment.
              </p>
            </div>

            <div className="mt-8 space-y-0 border-t border-border">
              {product.fields.description ? (
                <div className="border-b border-border py-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                    Details
                  </p>
                  <div className="mt-3 max-w-xl">
                    <RichText value={product.fields.description} />
                  </div>
                </div>
              ) : null}

              <dl className="grid gap-5 border-b border-border py-6 sm:grid-cols-2">
                {product.fields.materials ? (
                  <div className="space-y-1.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                      Materials
                    </dt>
                    <dd className="text-[14px] leading-6 text-ink">
                      {product.fields.materials}
                    </dd>
                  </div>
                ) : null}
                {product.fields.dimensions ? (
                  <div className="space-y-1.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                      Dimensions
                    </dt>
                    <dd className="text-[14px] leading-6 text-ink">
                      {product.fields.dimensions}
                    </dd>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                    Availability
                  </dt>
                  <dd className="text-[14px] leading-6 text-ink">
                    {inStock ? "Ready to ship" : "Currently unavailable"}
                  </dd>
                </div>
                {categoryTitle ? (
                  <div className="space-y-1.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                      Collection
                    </dt>
                    <dd className="text-[14px] leading-6 text-ink">
                      {categorySlug ? (
                        <Link
                          href={`/shop?category=${encodeURIComponent(categorySlug)}`}
                          className="underline-offset-4 hover:text-teal hover:underline"
                        >
                          {categoryTitle}
                        </Link>
                      ) : (
                        categoryTitle
                      )}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {(settings.fields["shipping-note"] ||
                settings.fields["payment-note"]) && (
                <div className="space-y-4 py-6 text-[13px] leading-6 text-stone">
                  {settings.fields["shipping-note"] ? (
                    <p>
                      <span className="font-medium text-ink">Shipping. </span>
                      {settings.fields["shipping-note"]}
                    </p>
                  ) : null}
                  {settings.fields["payment-note"] ? (
                    <p>
                      <span className="font-medium text-ink">Payment. </span>
                      {settings.fields["payment-note"]}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Continue browsing</p>
              <h2 className="section-title mt-3">You may also like</h2>
            </div>
            <Link
              href={
                categorySlug
                  ? `/shop?category=${encodeURIComponent(categorySlug)}`
                  : "/shop"
              }
              className="text-[12px] font-semibold uppercase tracking-[0.14em] text-stone transition-colors hover:text-teal"
            >
              View collection
            </Link>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard
                key={item.uuid}
                product={item}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
