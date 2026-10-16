import { NextResponse } from "next/server";
import { firstAsset } from "@/lib/assets";
import {
  type CartItem,
  cartTotals,
  getCart,
  mergeCartItem,
  removeCartItem,
  setCart,
  updateCartQuantity,
} from "@/lib/cart";
import {
  getProductBySlug,
  getSiteSettings,
  productInStock,
  productPrice,
  shippingRatesFromSettings,
} from "@/lib/content";

async function rates() {
  try {
    return shippingRatesFromSettings(await getSiteSettings());
  } catch {
    return undefined;
  }
}

export async function GET() {
  const [items, shippingRates] = await Promise.all([getCart(), rates()]);
  const totals = cartTotals(items, shippingRates);
  return NextResponse.json({ items, ...totals });
}

type CartBody = {
  action?: "add" | "update" | "remove";
  slug?: string;
  productUuid?: string;
  quantity?: number;
};

export async function POST(request: Request) {
  let body: CartBody;
  try {
    body = (await request.json()) as CartBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "add";
  const [items, shippingRates] = await Promise.all([getCart(), rates()]);

  if (action === "remove") {
    const productUuid = String(body.productUuid ?? "").trim();
    if (!productUuid) {
      return NextResponse.json({ error: "productUuid is required." }, { status: 400 });
    }
    const next = removeCartItem(items, productUuid);
    await setCart(next);
    return NextResponse.json({ items: next, ...cartTotals(next, shippingRates) });
  }

  if (action === "update") {
    const productUuid = String(body.productUuid ?? "").trim();
    const quantity = Number(body.quantity ?? 0);
    if (!productUuid) {
      return NextResponse.json({ error: "productUuid is required." }, { status: 400 });
    }
    const next = updateCartQuantity(items, productUuid, quantity);
    await setCart(next);
    return NextResponse.json({ items: next, ...cartTotals(next, shippingRates) });
  }

  const slug = String(body.slug ?? "").trim();
  const quantity = Math.max(1, Number(body.quantity ?? 1));
  if (!slug) {
    return NextResponse.json({ error: "slug is required." }, { status: 400 });
  }

  try {
    const product = await getProductBySlug(slug);
    if (!productInStock(product)) {
      return NextResponse.json({ error: "Product is out of stock." }, { status: 409 });
    }

    const image = firstAsset(product.fields["primary-image"]);
    const nextItem: CartItem = {
      productUuid: product.uuid,
      slug,
      title: product.fields.title || slug,
      price: productPrice(product),
      quantity,
      imageUrl: image?.url,
    };

    const next = mergeCartItem(items, nextItem);
    await setCart(next);
    return NextResponse.json({ items: next, ...cartTotals(next, shippingRates) });
  } catch {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const productUuid = url.searchParams.get("productUuid")?.trim();
  if (!productUuid) {
    return NextResponse.json({ error: "productUuid is required." }, { status: 400 });
  }

  const [items, shippingRates] = await Promise.all([getCart(), rates()]);
  const next = removeCartItem(items, productUuid);
  await setCart(next);
  return NextResponse.json({ items: next, ...cartTotals(next, shippingRates) });
}
