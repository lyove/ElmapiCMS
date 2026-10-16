import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import {
  ShopFiltersMobile,
  ShopFiltersSidebar,
} from "@/components/shop-filters";
import { getCategoryTree } from "@/lib/categories";
import { getCategories, getProducts, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import {
  activeShopFilters,
  collectMaterials,
  filterShopProducts,
  hasActiveShopFilters,
  parseShopSearchParams,
  shopHref,
  sortShopProducts,
} from "@/lib/shop-filters";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const rawParams = await searchParams;
  const params = parseShopSearchParams(rawParams);
  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    getCategories(),
  ]);

  const activeCategory = params.category
    ? categories.find((category) => category.fields.slug === params.category)
    : undefined;

  return buildMetadata({
    settings,
    title:
      activeCategory?.fields["seo-title"] ||
      activeCategory?.fields.title ||
      "Shop",
    description:
      activeCategory?.fields["seo-description"] ||
      activeCategory?.fields.summary ||
      "Browse ceramics, linen, glass, lamps, and objects from Sable Goods.",
    path: "/shop",
  });
}

export default async function ShopPage({ searchParams }: PageProps) {
  const rawParams = await searchParams;
  const params = parseShopSearchParams(rawParams);

  const [settings, categories, products] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getProducts(),
  ]);

  const tree = getCategoryTree(categories);
  const materials = collectMaterials(products);
  const currencySymbol = settings.fields["currency-symbol"] || "$";

  const filtered = sortShopProducts(
    filterShopProducts(products, params, categories),
    params.sort ?? "newest",
  );

  const chips = activeShopFilters(params, categories);
  const showClearAll = hasActiveShopFilters(params);
  const activeCategory = params.category
    ? categories.find((category) => category.fields.slug === params.category)
    : undefined;

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Catalog</p>
        <h1 className="section-title mt-3">
          {activeCategory?.fields.title || "Shop"}
        </h1>
        {activeCategory?.fields.summary ? (
          <p className="mt-3 text-[14px] leading-6 text-stone">
            {activeCategory.fields.summary}
          </p>
        ) : null}
      </header>

      <div className="mt-10 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <ShopFiltersSidebar tree={tree} materials={materials} params={params} />

        <div>
          <ShopFiltersMobile tree={tree} materials={materials} params={params} />

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:mt-0">
            <p className="text-[13px] text-stone">
              {filtered.length}{" "}
              {filtered.length === 1 ? "product" : "products"}
            </p>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
                Sort
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "newest", label: "Newest" },
                    { value: "price-asc", label: "Price ↑" },
                    { value: "price-desc", label: "Price ↓" },
                    { value: "title", label: "A-Z" },
                  ] as const
                ).map((option) => {
                  const active = (params.sort ?? "newest") === option.value;
                  return (
                    <Link
                      key={option.value}
                      href={shopHref(params, { sort: option.value })}
                      className={cn(
                        "border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
                        active
                          ? "border-ink bg-ink text-white"
                          : "border-border text-stone hover:border-ink hover:text-ink",
                      )}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {chips.length > 0 || showClearAll ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 border border-border bg-mist px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
                >
                  {chip.label}
                  <span aria-hidden className="text-stone">
                    ×
                  </span>
                </Link>
              ))}
              {showClearAll ? (
                <Link
                  href="/shop"
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal hover:text-ink"
                >
                  Clear all
                </Link>
              ) : null}
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <p className="mt-16 text-center text-stone">
              No products match these filters.
            </p>
          ) : (
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard
                  key={product.uuid}
                  product={product}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
