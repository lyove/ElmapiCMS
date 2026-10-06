import {
  AuthenticationError,
  ElmapiError,
  ValidationError,
} from "@elmapicms/js-sdk";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authUserFromMe } from "@/lib/auth-user";
import { createAuthClient } from "@/lib/elmapi-auth";
import { elmapi } from "@/lib/elmapi-server";
import {
  cartTotals,
  clearCart,
  generateOrderNumber,
  getCart,
} from "@/lib/cart";
import {
  getProductBySlug,
  getSiteSettings,
  productInStock,
  productPrice,
  shippingRatesFromSettings,
} from "@/lib/content";
import { toOrderLineItemGroups } from "@/lib/order";
import type { LineItem } from "@/lib/types";

type CheckoutBody = {
  shippingName?: string;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingCity?: string;
  shippingRegion?: string;
  shippingPostal?: string;
  shippingCountry?: string;
  shippingPhone?: string;
  notes?: string;
};

export async function POST(req: Request) {
  // Prefer auth() over getToken() — Auth.js v5 session cookies (esp. __Secure-*)
  // are reliably read by auth(); getToken often returns null in production.
  const session = await auth();
  const accessToken = session?.accessToken;

  if (!session || !accessToken || session.authError) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shippingName = String(body.shippingName ?? "").trim();
  const shippingLine1 = String(body.shippingLine1 ?? "").trim();
  const shippingCity = String(body.shippingCity ?? "").trim();
  const shippingRegion = String(body.shippingRegion ?? "").trim();
  const shippingPostal = String(body.shippingPostal ?? "").trim();
  const shippingCountry = String(body.shippingCountry ?? "").trim() || "US";

  if (!shippingName || !shippingLine1 || !shippingCity || !shippingPostal) {
    return NextResponse.json(
      { error: "Shipping name, address, city, and postal code are required." },
      { status: 400 },
    );
  }

  const cartItems = await getCart();
  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  let customerUserId = String(session.user?.id ?? "");
  let customerName = String(session.user?.name ?? "");
  let customerEmail = String(session.user?.email ?? "");

  try {
    const authClient = createAuthClient({ accessToken });
    const me = authUserFromMe(
      (await authClient.me()) as Record<string, unknown>,
    );
    customerUserId = String(me.uuid ?? me.id ?? customerUserId);
    customerName =
      (me.display_name as string | undefined) ||
      customerName ||
      customerEmail;
    customerEmail = String(me.email ?? customerEmail);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Session expired." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Could not verify identity." },
      { status: 502 },
    );
  }

  const lineItems: LineItem[] = [];

  try {
    for (const item of cartItems) {
      const product = await getProductBySlug(item.slug);
      if (!productInStock(product)) {
        return NextResponse.json(
          { error: `${item.title} is out of stock.` },
          { status: 409 },
        );
      }
      lineItems.push({
        productUuid: product.uuid,
        slug: item.slug,
        title: product.fields.title || item.title,
        price: productPrice(product),
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "One or more cart items are no longer available." },
      { status: 409 },
    );
  }

  const settings = await getSiteSettings();
  const { subtotal, shipping, total } = cartTotals(
    lineItems,
    shippingRatesFromSettings(settings),
  );
  const currency = settings.fields["currency-label"] || "USD";
  const paymentNote =
    settings.fields["payment-note"] ||
    "Invoice / pay on fulfillment. No card payment at checkout.";

  const orderNumber = generateOrderNumber();

  const orderData = {
    "order-number": orderNumber,
    status: "pending_payment",
    "line-items": toOrderLineItemGroups(lineItems),
    subtotal,
    "shipping-total": shipping,
    total,
    currency,
    "customer-user-id": customerUserId,
    "customer-name": customerName || customerEmail || "Customer",
    "customer-email": customerEmail,
    "shipping-name": shippingName,
    "shipping-line1": shippingLine1,
    "shipping-line2": String(body.shippingLine2 ?? "").trim() || "",
    "shipping-city": shippingCity,
    "shipping-region": shippingRegion || "",
    "shipping-postal": shippingPostal,
    "shipping-country": shippingCountry,
    "shipping-phone": String(body.shippingPhone ?? "").trim() || "",
    notes: String(body.notes ?? "").trim() || "",
    "payment-method-note": paymentNote,
  };

  try {
    // Create as draft then publish. Avoids partial published snapshots if a
    // field write fails mid-request (seen with select-type status fields).
    const entry = (await elmapi.content.create("orders", {
      data: orderData,
      state: "draft",
    })) as { uuid: string };

    if (!entry?.uuid) {
      return NextResponse.json(
        { error: "Order create failed." },
        { status: 500 },
      );
    }

    await elmapi.content.publish("orders", entry.uuid);
    await clearCart();

    return NextResponse.json({
      ok: true,
      uuid: entry.uuid,
      orderNumber,
      total,
    });
  } catch (error) {
    console.error("checkout order create failed", error);
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message || "Validation failed.",
          details: error.details,
        },
        { status: 422 },
      );
    }
    if (error instanceof ElmapiError) {
      return NextResponse.json(
        { error: error.message || "Order create failed." },
        { status: error.statusCode || 400 },
      );
    }
    return NextResponse.json({ error: "Order create failed." }, { status: 500 });
  }
}
