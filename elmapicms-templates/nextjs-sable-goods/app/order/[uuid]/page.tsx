import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { authUserFromMe } from "@/lib/auth-user";
import { createAuthClient } from "@/lib/elmapi-auth";
import { getOrderByUuid, getSiteSettings } from "@/lib/content";
import { formatMoney } from "@/lib/format";
import {
  orderStatusLabel,
  orderStatusTone,
  parseOrderLineItems,
} from "@/lib/order";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ uuid: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { uuid } = await params;
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Order confirmation",
    description: "Your Sable Goods order confirmation.",
    path: `/order/${uuid}`,
    robots: { index: false, follow: false },
  });
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { uuid } = await params;
  const session = await auth();

  if (!session?.user?.id || !session.accessToken || session.authError) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/order/${uuid}`)}`);
  }

  let order;
  let settings;
  try {
    [order, settings] = await Promise.all([
      getOrderByUuid(uuid),
      getSiteSettings(),
    ]);
  } catch {
    notFound();
  }

  const ownerIds = new Set(
    [session.user.id, session.user.email].filter(Boolean) as string[],
  );
  try {
    const me = authUserFromMe(
      (await createAuthClient({
        accessToken: session.accessToken,
      }).me()) as Record<string, unknown>,
    );
    const uuidOrId = me.uuid ?? me.id;
    if (uuidOrId) ownerIds.add(String(uuidOrId));
    if (me.email) ownerIds.add(String(me.email));
  } catch {
    // Fall back to session claims if me() fails.
  }

  const customerId = order.fields["customer-user-id"];
  if (!customerId || !ownerIds.has(customerId)) {
    notFound();
  }

  const currencySymbol = settings.fields["currency-symbol"] || "$";
  const lineItems = parseOrderLineItems(order.fields["line-items"]);
  const subtotal = Number(order.fields.subtotal ?? 0);
  const shipping = Number(order.fields["shipping-total"] ?? 0);
  const total = Number(order.fields.total ?? 0);
  const placed = order.published_at
    ? new Date(order.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const addressLines = [
    order.fields["shipping-name"],
    order.fields["shipping-line1"],
    order.fields["shipping-line2"],
    [
      order.fields["shipping-city"],
      order.fields["shipping-region"],
      order.fields["shipping-postal"],
    ]
      .filter(Boolean)
      .join(", "),
    order.fields["shipping-country"],
  ].filter(Boolean);

  return (
    <div>
      <section className="border-b border-border bg-mist">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="animate-rise">
              <p className="eyebrow">Order placed</p>
              <h1 className="section-title mt-3">Thank you</h1>
              <p className="section-lead mt-3 max-w-lg">
                Your order is recorded. We will follow up with invoice and
                fulfillment details by email.
              </p>
            </div>
            <ol className="animate-rise animate-rise-delay-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              <li className="text-stone/50">Cart</li>
              <li aria-hidden className="text-stone/40">
                /
              </li>
              <li className="text-stone/50">Checkout</li>
              <li aria-hidden className="text-stone/40">
                /
              </li>
              <li className="text-teal">Confirmation</li>
            </ol>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-16">
          <div className="min-w-0 space-y-10">
            <section className="animate-rise border border-border bg-mist px-6 py-6 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                    Order number
                  </p>
                  <p className="mt-2 font-heading text-2xl font-bold tracking-tight text-ink">
                    {order.fields["order-number"]}
                  </p>
                  {placed ? (
                    <p className="mt-2 text-[13px] text-stone">Placed {placed}</p>
                  ) : null}
                </div>
                <span
                  className={`border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] capitalize ${orderStatusTone(order.fields.status)}`}
                >
                  {orderStatusLabel(order.fields.status)}
                </span>
              </div>
              <p className="mt-5 max-w-xl text-[14px] leading-6 text-stone">
                {order.fields["payment-method-note"] ||
                  settings.fields["payment-note"] ||
                  "We will email invoice and payment instructions. No card was charged at checkout."}
              </p>
              {settings.fields["shipping-note"] ? (
                <p className="mt-3 max-w-xl text-[14px] leading-6 text-stone">
                  {settings.fields["shipping-note"]}
                </p>
              ) : null}
            </section>

            <section className="animate-rise animate-rise-delay-1">
              <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-border pb-3">
                <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
                  Items
                </h2>
                <p className="text-[12px] text-stone">
                  {lineItems.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  {lineItems.reduce((sum, item) => sum + item.quantity, 0) === 1
                    ? "item"
                    : "items"}
                </p>
              </div>
              <ul className="divide-y divide-border">
                {lineItems.map((item) => (
                  <li
                    key={`${item.productUuid}-${item.slug}`}
                    className="flex gap-4 py-5"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden bg-mist sm:size-20">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-stone">
                          Item
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {item.slug ? (
                        <Link
                          href={`/shop/${item.slug}`}
                          className="font-heading text-[15px] font-bold tracking-tight text-ink transition-colors hover:text-teal"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="font-heading text-[15px] font-bold tracking-tight text-ink">
                          {item.title}
                        </p>
                      )}
                      <p className="mt-1 text-[13px] text-stone">
                        Qty {item.quantity} ·{" "}
                        {formatMoney(item.price, currencySymbol)} each
                      </p>
                    </div>
                    <p className="shrink-0 text-[14px] font-medium tabular-nums text-ink">
                      {formatMoney(item.price * item.quantity, currencySymbol)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-wrap gap-3 animate-rise animate-rise-delay-2">
              <Link href="/account" className="shop-cta">
                View account
              </Link>
              <Link href="/shop" className="shop-cta-outline">
                Continue shopping
              </Link>
            </div>
          </div>

          <aside className="animate-rise animate-rise-delay-1 space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="border border-border bg-mist">
              <div className="border-b border-border px-6 py-5">
                <p className="eyebrow">Order total</p>
                <p className="mt-2 font-heading text-xl font-bold tracking-tight text-ink">
                  {formatMoney(total, currencySymbol)}
                </p>
              </div>
              <dl className="space-y-2.5 px-6 py-5 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone">Subtotal</dt>
                  <dd className="tabular-nums text-ink">
                    {formatMoney(subtotal, currencySymbol)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone">Shipping</dt>
                  <dd className="tabular-nums text-ink">
                    {shipping === 0
                      ? "Free"
                      : formatMoney(shipping, currencySymbol)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3 text-[15px] font-semibold">
                  <dt className="text-ink">Total</dt>
                  <dd className="tabular-nums text-ink">
                    {formatMoney(total, currencySymbol)}
                  </dd>
                </div>
              </dl>
            </div>

            {addressLines.length > 0 ? (
              <div className="border border-border px-6 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                  Ship to
                </p>
                <address className="mt-3 space-y-1 not-italic text-[14px] leading-6 text-ink">
                  {addressLines.map((line) => (
                    <p key={String(line)}>{line}</p>
                  ))}
                </address>
                {order.fields["shipping-phone"] ? (
                  <p className="mt-3 text-[13px] text-stone">
                    {order.fields["shipping-phone"]}
                  </p>
                ) : null}
              </div>
            ) : null}

            {order.fields.notes ? (
              <div className="border border-border px-6 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                  Notes
                </p>
                <p className="mt-3 text-[14px] leading-6 text-ink">
                  {order.fields.notes}
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
