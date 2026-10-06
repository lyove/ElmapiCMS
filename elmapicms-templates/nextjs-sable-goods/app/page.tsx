import Image from "next/image";
import Link from "next/link";
import { BlogCard } from "@/components/blog-card";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getCategories,
  getFeaturedBlogPosts,
  getFeaturedProducts,
  getHomePage,
  getProducts,
  getSiteSettings,
  productPrice,
} from "@/lib/content";
import { formatMoney } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const [settings, home] = await Promise.all([
    getSiteSettings(),
    getHomePage(),
  ]);
  const hero = firstAsset(home.fields["hero-image"]);
  return buildMetadata({
    settings,
    title: home.fields["seo-title"] || home.fields["hero-headline"],
    description:
      home.fields["seo-description"] || home.fields["hero-subheadline"],
    path: "",
    imageUrl: hero?.url,
  });
}

export default async function HomePage() {
  const [home, settings, categories, products, blogPosts] = await Promise.all([
    getHomePage(),
    getSiteSettings(),
    getCategories(),
    getProducts(),
    getFeaturedBlogPosts(3),
  ]);

  const hero = firstAsset(home.fields["hero-image"]);
  const featured = (await getFeaturedProducts()).slice(0, 8);
  const displayProducts =
    featured.length > 0 ? featured : products.slice(0, 8);
  const restProducts = products
    .filter((product) => !displayProducts.some((f) => f.uuid === product.uuid))
    .slice(0, 4);
  const currencySymbol = settings.fields["currency-symbol"] || "$";
  const promoCategory = categories[0];
  const promoProduct = displayProducts[0];

  return (
    <div>
      {/* Full-viewport hero */}
      <section className="relative isolate h-[100dvh] min-h-[640px] overflow-hidden bg-mist">
        {hero?.url ? (
          <Image
            src={hero.url}
            alt={assetAlt(hero, "Sable Goods hero")}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/25 to-transparent"
        />
        <div className="relative mx-auto flex h-full max-w-7xl items-center px-5 py-24 sm:px-8">
          <Reveal className="max-w-md">
            <p className="eyebrow text-ink/70">
              {home.fields["categories-heading"] || "Home collection"}
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {home.fields["hero-headline"]}
            </h1>
            {home.fields["hero-subheadline"] ? (
              <p className="mt-4 text-[15px] leading-7 text-ink/70">
                {home.fields["hero-subheadline"]}
              </p>
            ) : null}
            {promoProduct ? (
              <p className="mt-6 text-sm font-medium text-ink">
                From {formatMoney(productPrice(promoProduct), currencySymbol)}
              </p>
            ) : null}
            {home.fields["hero-cta-label"] && home.fields["hero-cta-href"] ? (
              <Link
                href={home.fields["hero-cta-href"]}
                className="shop-cta mt-8"
              >
                {home.fields["hero-cta-label"]}
              </Link>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* Products immediately after hero */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">
            {home.fields["featured-heading"] || "Newest Design"}
          </h2>
          {home.fields["featured-intro"] ? (
            <p className="section-lead mx-auto">{home.fields["featured-intro"]}</p>
          ) : null}
        </div>
        <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {displayProducts.map((product) => (
            <ProductCard
              key={product.uuid}
              product={product}
              currencySymbol={currencySymbol}
            />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/shop" className="shop-cta-outline">
            View all
          </Link>
        </div>
      </section>

      {promoCategory ? (
        <section className="border-y border-border bg-mist">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2">
            <div className="relative aspect-[16/10] overflow-hidden bg-white lg:order-2">
              {firstAsset(promoCategory.fields.image)?.url ? (
                <Image
                  src={firstAsset(promoCategory.fields.image)!.url}
                  alt={assetAlt(
                    firstAsset(promoCategory.fields.image),
                    promoCategory.fields.title || "Collection",
                  )}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : null}
            </div>
            <div className="lg:order-1">
              <p className="eyebrow">
                #{promoCategory.fields.title || "Collection"}
              </p>
              <h2 className="mt-3 section-title">
                {home.fields["categories-heading"] || "Shop by material"}
              </h2>
              {promoCategory.fields.summary ? (
                <p className="section-lead">{promoCategory.fields.summary}</p>
              ) : null}
              <Link
                href={
                  promoCategory.fields.slug
                    ? `/shop?category=${promoCategory.fields.slug}`
                    : "/shop"
                }
                className="shop-cta mt-8"
              >
                Shop now
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {restProducts.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="section-title">More from the shop</h2>
            <p className="section-lead mx-auto">
              {home.fields["categories-intro"] ||
                "Keep browsing ceramics, linen, glass, lamps, and objects."}
            </p>
          </div>
          <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {restProducts.map((product) => (
              <ProductCard
                key={product.uuid}
                product={product}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        </section>
      ) : null}

      {blogPosts.length > 0 ? (
        <section className="border-t border-border bg-mist">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Blog</p>
              <h2 className="section-title mt-3">From the studio</h2>
              <p className="section-lead mx-auto">
                Notes on materials, makers, and quiet rooms.
              </p>
            </div>
            <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post) => (
                <BlogCard key={post.uuid} post={post} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/blog" className="shop-cta-outline">
                Read the blog
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-border bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">Studio</p>
            <h2 className="section-title mt-3">Made for rooms you use</h2>
            <p className="section-lead mt-4 max-w-lg">
              {settings.fields["footer-blurb"] ||
                settings.fields.description ||
                "Small-batch ceramics, linen, glass, and lamps for considered homes."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/about" className="shop-cta">
                About the shop
              </Link>
              <Link href="/shop" className="shop-cta-outline">
                Shop the collection
              </Link>
            </div>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:gap-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
                Shipping
              </p>
              <p className="mt-3 text-[14px] leading-6 text-stone">
                {settings.fields["shipping-note"] ||
                  "Packed to order and shipped when your invoice is settled."}
              </p>
              <Link
                href="/shipping"
                className="mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.12em] text-ink hover:text-teal"
              >
                Shipping details
              </Link>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
                Checkout
              </p>
              <p className="mt-3 text-[14px] leading-6 text-stone">
                {settings.fields["payment-note"] ||
                  "Account-only orders with invoice payment on fulfillment."}
              </p>
              <Link
                href="/register"
                className="mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.12em] text-ink hover:text-teal"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
