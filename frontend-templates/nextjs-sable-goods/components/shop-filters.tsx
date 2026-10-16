import Link from "next/link";
import { ShopPriceFilter } from "@/components/shop-price-filter";
import type { CategoryTreeNode } from "@/lib/categories";
import type { ShopSearchParams } from "@/lib/shop-params";
import { shopHref } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-5 last:border-b-0">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CategoryTreeLinks({
  tree,
  params,
  activeSlug,
}: {
  tree: CategoryTreeNode[];
  params: ShopSearchParams;
  activeSlug?: string;
}) {
  return (
    <ul className="space-y-3">
      <li>
        <Link
          href={shopHref(params, { category: undefined })}
          className={cn(
            "text-[13px] transition-colors hover:text-teal",
            !activeSlug ? "font-semibold text-ink" : "text-stone",
          )}
        >
          All products
        </Link>
      </li>
      {tree.map(({ root, children }) => {
        const rootSlug = root.fields.slug;
        if (!rootSlug) return null;
        const rootActive = activeSlug === rootSlug;
        return (
          <li key={root.uuid}>
            <Link
              href={shopHref(params, { category: rootSlug })}
              className={cn(
                "text-[13px] font-medium transition-colors hover:text-teal",
                rootActive ? "text-ink" : "text-stone",
              )}
            >
              {root.fields.title}
            </Link>
            {children.length > 0 ? (
              <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
                {children.map((child) => {
                  const childSlug = child.fields.slug;
                  if (!childSlug) return null;
                  const childActive = activeSlug === childSlug;
                  return (
                    <li key={child.uuid}>
                      <Link
                        href={shopHref(params, { category: childSlug })}
                        className={cn(
                          "text-[12px] transition-colors hover:text-teal",
                          childActive ? "font-medium text-ink" : "text-stone",
                        )}
                      >
                        {child.fields.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function StockRadios({ params }: { params: ShopSearchParams }) {
  const options = [
    { value: undefined, label: "All" },
    { value: "in" as const, label: "In stock" },
    { value: "out" as const, label: "Out of stock" },
  ];

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const active = params.stock === option.value;
        return (
          <Link
            key={option.label}
            href={shopHref(params, { stock: option.value })}
            className={cn(
              "flex items-center gap-2 text-[13px] transition-colors hover:text-teal",
              active ? "font-semibold text-ink" : "text-stone",
            )}
          >
            <span
              className={cn(
                "size-3.5 rounded-full border",
                active ? "border-teal bg-teal" : "border-border bg-white",
              )}
              aria-hidden
            />
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function SortSelect({ params }: { params: ShopSearchParams }) {
  const sort = params.sort ?? "newest";
  const options = [
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: low to high" },
    { value: "price-desc", label: "Price: high to low" },
    { value: "title", label: "Title A-Z" },
  ] as const;

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const active = sort === option.value;
        return (
          <Link
            key={option.value}
            href={shopHref(params, { sort: option.value })}
            className={cn(
              "block text-[13px] transition-colors hover:text-teal",
              active ? "font-semibold text-ink" : "text-stone",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ShopFiltersSidebar({
  tree,
  materials,
  params,
}: {
  tree: CategoryTreeNode[];
  materials: string[];
  params: ShopSearchParams;
}) {
  return (
    <aside className="hidden lg:block">
      <FilterSection title="Category">
        <CategoryTreeLinks
          tree={tree}
          params={params}
          activeSlug={params.category}
        />
      </FilterSection>

      {materials.length > 0 ? (
        <FilterSection title="Material">
          <ul className="space-y-2">
            {materials.map((material) => {
              const active =
                params.material?.toLowerCase() === material.toLowerCase();
              return (
                <li key={material}>
                  <Link
                    href={shopHref(params, { material })}
                    className={cn(
                      "text-[13px] transition-colors hover:text-teal",
                      active ? "font-semibold text-ink" : "text-stone",
                    )}
                  >
                    {material}
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterSection>
      ) : null}

      <FilterSection title="Price">
        <ShopPriceFilter params={params} />
      </FilterSection>

      <FilterSection title="Availability">
        <StockRadios params={params} />
      </FilterSection>

      <FilterSection title="Featured">
        <Link
          href={shopHref(params, { featured: params.featured ? undefined : true })}
          className={cn(
            "flex items-center gap-2 text-[13px] transition-colors hover:text-teal",
            params.featured ? "font-semibold text-ink" : "text-stone",
          )}
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center border",
              params.featured
                ? "border-teal bg-teal text-white"
                : "border-border bg-white",
            )}
            aria-hidden
          >
            {params.featured ? "✓" : null}
          </span>
          Featured only
        </Link>
      </FilterSection>

      <FilterSection title="Sort">
        <SortSelect params={params} />
      </FilterSection>
    </aside>
  );
}

export function ShopFiltersMobile({
  tree,
  materials,
  params,
}: {
  tree: CategoryTreeNode[];
  materials: string[];
  params: ShopSearchParams;
}) {
  return (
    <div className="space-y-6 border border-border bg-mist p-4 lg:hidden">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
          Category
        </p>
        <CategoryTreeLinks
          tree={tree}
          params={params}
          activeSlug={params.category}
        />
      </div>

      {materials.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
            Material
          </p>
          <div className="flex flex-wrap gap-2">
            {materials.map((material) => {
              const active =
                params.material?.toLowerCase() === material.toLowerCase();
              return (
                <Link
                  key={material}
                  href={shopHref(params, { material })}
                  className={cn(
                    "border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-white text-stone hover:border-ink hover:text-ink",
                  )}
                >
                  {material}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
          Price
        </p>
        <ShopPriceFilter params={params} />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
          Availability
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: undefined, label: "All" },
            { value: "in" as const, label: "In stock" },
            { value: "out" as const, label: "Out of stock" },
          ].map((option) => {
            const active = params.stock === option.value;
            return (
              <Link
                key={option.label}
                href={shopHref(params, { stock: option.value })}
                className={cn(
                  "border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-white text-stone hover:border-ink hover:text-ink",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={shopHref(params, { featured: params.featured ? undefined : true })}
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.12em]",
            params.featured ? "text-ink" : "text-stone hover:text-teal",
          )}
        >
          {params.featured ? "✓ Featured only" : "Featured only"}
        </Link>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
          Sort
        </p>
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
                    : "border-border bg-white text-stone hover:border-ink hover:text-ink",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
