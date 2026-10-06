import type { ShopSearchParams, ShopSort } from "@/lib/shop-params";

export type { ShopSearchParams, ShopSort } from "@/lib/shop-params";

export function parseShopSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ShopSearchParams {
  const category =
    typeof raw.category === "string" ? raw.category.trim() || undefined : undefined;
  const material =
    typeof raw.material === "string" ? raw.material.trim() || undefined : undefined;
  const min = typeof raw.min === "string" ? raw.min.trim() || undefined : undefined;
  const max = typeof raw.max === "string" ? raw.max.trim() || undefined : undefined;
  const stockRaw =
    typeof raw.stock === "string" ? raw.stock.trim().toLowerCase() : undefined;
  const stock = stockRaw === "in" || stockRaw === "out" ? stockRaw : undefined;
  const featured = raw.featured === "1";
  const sortRaw = typeof raw.sort === "string" ? raw.sort.trim() : undefined;
  const sort: ShopSort | undefined =
    sortRaw === "newest" ||
    sortRaw === "price-asc" ||
    sortRaw === "price-desc" ||
    sortRaw === "title"
      ? sortRaw
      : undefined;

  return { category, material, min, max, stock, featured, sort };
}

export function buildShopQuery(
  params: ShopSearchParams,
  updates: Partial<ShopSearchParams> = {},
): Record<string, string> {
  const merged: ShopSearchParams = { ...params, ...updates };

  for (const key of Object.keys(updates) as (keyof ShopSearchParams)[]) {
    if (updates[key] === undefined || updates[key] === "") {
      delete merged[key];
    }
  }

  const query: Record<string, string> = {};
  if (merged.category) query.category = merged.category;
  if (merged.material) query.material = merged.material;
  if (merged.min) query.min = merged.min;
  if (merged.max) query.max = merged.max;
  if (merged.stock) query.stock = merged.stock;
  if (merged.featured) query.featured = "1";
  if (merged.sort && merged.sort !== "newest") query.sort = merged.sort;
  return query;
}

/** Build /shop href. Safe for client components. */
export function shopHref(
  params: ShopSearchParams,
  updates: Partial<ShopSearchParams> = {},
): string {
  const query = buildShopQuery(params, updates);
  const search = new URLSearchParams(query).toString();
  return search ? `/shop?${search}` : "/shop";
}
