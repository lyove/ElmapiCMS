import type { ContentEntry, ProductFields } from "@/lib/types";

/** Pure product helpers. Safe for client components (no Elmapi client). */

export function productPrice(product: ContentEntry<ProductFields>): number {
  const raw = product.fields.price;
  return typeof raw === "number" ? raw : Number(raw ?? 0);
}

export function productInStock(product: ContentEntry<ProductFields>): boolean {
  return product.fields["in-stock"] !== false;
}
