import type { LineItem, OrderLineItemFields, OrderStatus } from "@/lib/types";

/** Enumeration fields may return a string or a single-value array. */
export function normalizeOrderStatus(
  status: unknown,
): OrderStatus | string | undefined {
  if (typeof status === "string" && status.trim()) return status;
  if (Array.isArray(status)) {
    const first = status.find((value) => typeof value === "string" && value);
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

export function orderStatusLabel(status: unknown): string {
  const value = normalizeOrderStatus(status);
  if (!value) return "Placed";
  return value.replace(/_/g, " ");
}

export function orderStatusTone(status: unknown): string {
  const value = normalizeOrderStatus(status) || "placed";
  if (value === "fulfilled" || value === "confirmed") {
    return "border-teal/30 bg-teal/10 text-teal";
  }
  if (value === "cancelled") {
    return "border-destructive/20 bg-destructive/5 text-destructive";
  }
  return "border-border bg-white text-stone";
}

function relatedProductUuid(product: OrderLineItemFields["product"]): string {
  if (typeof product === "string") return product;
  if (product && typeof product === "object" && "uuid" in product) {
    return String(product.uuid ?? "");
  }
  return "";
}

/** Normalize repeatable group rows, legacy JSON string, or LineItem arrays. */
export function parseOrderLineItems(raw: unknown): LineItem[] {
  if (!raw) return [];

  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseOrderLineItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw) || raw.length === 0) return [];

  const first = raw[0];
  if (!first || typeof first !== "object") return [];

  // Legacy cart LineItem shape
  if ("productUuid" in first && "price" in first) {
    return raw as LineItem[];
  }

  // Repeatable group shape
  return (raw as OrderLineItemFields[]).map((row) => {
    // Legacy rows may still carry product-uuid after the field was removed.
    const legacyUuid =
      "product-uuid" in row
        ? String((row as { "product-uuid"?: string })["product-uuid"] ?? "")
        : "";
    const productUuid = relatedProductUuid(row.product) || legacyUuid;
    return {
      productUuid,
      slug: String(row.slug || productUuid || "item"),
      title: String(row.title ?? "Product"),
      price: Number(row["unit-price"] ?? 0),
      quantity: Math.max(1, Number(row.quantity ?? 1)),
      imageUrl: row["image-url"] || undefined,
    };
  });
}

export function toOrderLineItemGroups(items: LineItem[]): OrderLineItemFields[] {
  return items.map((item) => ({
    product: item.productUuid,
    title: item.title,
    slug: item.slug,
    quantity: item.quantity,
    "unit-price": item.price,
    "image-url": item.imageUrl || "",
  }));
}
