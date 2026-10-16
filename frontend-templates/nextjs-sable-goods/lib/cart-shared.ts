/** Pure cart helpers and types. Safe for client components (no next/headers). */

export type CartItem = {
  productUuid: string;
  slug: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type ShippingRates = {
  flatShipping: number;
  freeShippingThreshold: number;
};

export const CART_COOKIE = "sable-cart";
/** Fallback when Site Settings values are missing. Prefer CMS fields. */
export const FLAT_SHIPPING = 12;
export const FREE_SHIPPING_THRESHOLD = 150;

export function resolveShippingRates(input?: {
  flatShipping?: number | string | null;
  freeShippingThreshold?: number | string | null;
}): ShippingRates {
  const flat = Number(input?.flatShipping);
  const threshold = Number(input?.freeShippingThreshold);
  return {
    flatShipping:
      Number.isFinite(flat) && flat >= 0 ? flat : FLAT_SHIPPING,
    freeShippingThreshold:
      Number.isFinite(threshold) && threshold > 0
        ? threshold
        : FREE_SHIPPING_THRESHOLD,
  };
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateShipping(
  subtotal: number,
  rates?: Partial<ShippingRates>,
): number {
  const { flatShipping, freeShippingThreshold } = resolveShippingRates(rates);
  return subtotal >= freeShippingThreshold ? 0 : flatShipping;
}

export function cartTotals(
  items: CartItem[],
  rates?: Partial<ShippingRates>,
): {
  subtotal: number;
  shipping: number;
  total: number;
} {
  const subtotal = cartSubtotal(items);
  const shipping = calculateShipping(subtotal, rates);
  return { subtotal, shipping, total: subtotal + shipping };
}

export function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SG-${stamp}-${suffix}`;
}

export function mergeCartItem(items: CartItem[], next: CartItem): CartItem[] {
  const existing = items.find((item) => item.productUuid === next.productUuid);
  if (!existing) return [...items, next];
  return items.map((item) =>
    item.productUuid === next.productUuid
      ? { ...item, quantity: item.quantity + next.quantity }
      : item,
  );
}

export function updateCartQuantity(
  items: CartItem[],
  productUuid: string,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) {
    return items.filter((item) => item.productUuid !== productUuid);
  }
  return items.map((item) =>
    item.productUuid === productUuid ? { ...item, quantity } : item,
  );
}

export function removeCartItem(
  items: CartItem[],
  productUuid: string,
): CartItem[] {
  return items.filter((item) => item.productUuid !== productUuid);
}
