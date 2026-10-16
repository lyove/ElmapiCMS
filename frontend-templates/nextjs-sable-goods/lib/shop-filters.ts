import { productMatchesCategory } from "@/lib/categories";
import { productInStock, productPrice } from "@/lib/product";
import {
  type ShopSearchParams,
  type ShopSort,
  shopHref,
} from "@/lib/shop-url";
import type { CategoryFields, ContentEntry, ProductFields } from "@/lib/types";

export type { ShopSearchParams, ShopSort } from "@/lib/shop-url";
export {
  buildShopQuery,
  parseShopSearchParams,
  shopHref,
} from "@/lib/shop-url";

export function collectMaterials(
  products: ContentEntry<ProductFields>[],
): string[] {
  const seen = new Set<string>();
  const materials: string[] = [];

  for (const product of products) {
    const raw = product.fields.materials?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    materials.push(raw);
  }

  return materials.sort((a, b) => a.localeCompare(b));
}

function materialMatches(
  product: ContentEntry<ProductFields>,
  material: string,
): boolean {
  const value = product.fields.materials?.trim();
  if (!value) return false;
  const needle = material.trim().toLowerCase();
  return value.toLowerCase() === needle || value.toLowerCase().includes(needle);
}

export function filterShopProducts(
  products: ContentEntry<ProductFields>[],
  params: ShopSearchParams,
  categories: ContentEntry<CategoryFields>[],
): ContentEntry<ProductFields>[] {
  let filtered = products;

  if (params.category) {
    filtered = filtered.filter((product) =>
      productMatchesCategory(product, params.category!, categories),
    );
  }

  if (params.material) {
    filtered = filtered.filter((product) =>
      materialMatches(product, params.material!),
    );
  }

  if (params.min) {
    const min = Number(params.min);
    if (!Number.isNaN(min)) {
      filtered = filtered.filter((product) => productPrice(product) >= min);
    }
  }

  if (params.max) {
    const max = Number(params.max);
    if (!Number.isNaN(max)) {
      filtered = filtered.filter((product) => productPrice(product) <= max);
    }
  }

  if (params.stock === "in") {
    filtered = filtered.filter((product) => productInStock(product));
  } else if (params.stock === "out") {
    filtered = filtered.filter((product) => !productInStock(product));
  }

  if (params.featured) {
    filtered = filtered.filter((product) => Boolean(product.fields.featured));
  }

  return filtered;
}

export function sortShopProducts(
  products: ContentEntry<ProductFields>[],
  sort: ShopSort = "newest",
): ContentEntry<ProductFields>[] {
  const items = [...products];

  switch (sort) {
    case "price-asc":
      return items.sort((a, b) => productPrice(a) - productPrice(b));
    case "price-desc":
      return items.sort((a, b) => productPrice(b) - productPrice(a));
    case "title":
      return items.sort((a, b) =>
        (a.fields.title ?? "").localeCompare(b.fields.title ?? ""),
      );
    case "newest":
    default:
      return items.sort(
        (a, b) =>
          new Date(b.published_at ?? 0).getTime() -
          new Date(a.published_at ?? 0).getTime(),
      );
  }
}

export type ActiveShopFilter = {
  key: keyof ShopSearchParams;
  label: string;
  href: string;
};

export function activeShopFilters(
  params: ShopSearchParams,
  categories: ContentEntry<CategoryFields>[],
): ActiveShopFilter[] {
  const chips: ActiveShopFilter[] = [];

  if (params.category) {
    const match = categories.find((c) => c.fields.slug === params.category);
    chips.push({
      key: "category",
      label: match?.fields.title || params.category,
      href: shopHref(params, { category: undefined }),
    });
  }

  if (params.material) {
    chips.push({
      key: "material",
      label: params.material,
      href: shopHref(params, { material: undefined }),
    });
  }

  if (params.min) {
    chips.push({
      key: "min",
      label: `Min $${params.min}`,
      href: shopHref(params, { min: undefined }),
    });
  }

  if (params.max) {
    chips.push({
      key: "max",
      label: `Max $${params.max}`,
      href: shopHref(params, { max: undefined }),
    });
  }

  if (params.stock === "in") {
    chips.push({
      key: "stock",
      label: "In stock",
      href: shopHref(params, { stock: undefined }),
    });
  } else if (params.stock === "out") {
    chips.push({
      key: "stock",
      label: "Out of stock",
      href: shopHref(params, { stock: undefined }),
    });
  }

  if (params.featured) {
    chips.push({
      key: "featured",
      label: "Featured",
      href: shopHref(params, { featured: undefined }),
    });
  }

  return chips;
}

export function hasActiveShopFilters(params: ShopSearchParams): boolean {
  return Boolean(
    params.category ||
      params.material ||
      params.min ||
      params.max ||
      params.stock ||
      params.featured ||
      (params.sort && params.sort !== "newest"),
  );
}
