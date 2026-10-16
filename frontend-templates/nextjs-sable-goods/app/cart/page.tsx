import Link from "next/link";
import { CartLine } from "@/components/cart-line";
import { cartTotals, getCart } from "@/lib/cart";
import { getSiteSettings, shippingRatesFromSettings } from "@/lib/content";
import { formatMoney } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Cart",
    description: "Review items in your Sable Goods cart.",
    path: "/cart",
    robots: { index: false, follow: false },
  });
}

export default async function CartPage() {
  const [items, settings] = await Promise.all([getCart(), getSiteSettings()]);
  const currencySymbol = settings.fields["currency-symbol"] || "$";
  const rates = shippingRatesFromSettings(settings);
  const { subtotal, shipping, total } = cartTotals(items, rates);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const towardFree = Math.max(0, rates.freeShippingThreshold - subtotal);
  const freeProgress = Math.min(
    100,
    Math.round((subtotal / rates.freeShippingThreshold) * 100),
  );

  return (
    <div>
      <section className="border-b border-border bg-mist">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="animate-rise">
              <p className="eyebrow">Your selection</p>
              <h1 className="section-title mt-3">Cart</h1>
              <p className="section-lead mt-3">
                {items.length === 0
                  ? "Nothing here yet. Start with a piece from the shop."
                  : `${itemCount} ${itemCount === 1 ? "item" : "items"} ready for checkout.`}
              </p>
            </div>
            <ol className="animate-rise animate-rise-delay-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              <li className="text-teal">Cart</li>
              <li aria-hidden className="text-stone/40">
                /
              </li>
              <li className="text-stone/50">Checkout</li>
              <li aria-hidden className="text-stone/40">
                /
              </li>
              <li className="text-stone/50">Confirmation</li>
            </ol>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        {items.length === 0 ? (
          <div className="mx-auto max-w-lg border border-border bg-mist px-8 py-14 text-center">
            <p className="font-heading text-xl font-bold tracking-tight text-ink">
              Your cart is empty
            </p>
            <p className="mt-3 text-[14px] leading-6 text-stone">
              Browse ceramics, linen, and objects made for daily use.
            </p>
            <Link href="/shop" className="shop-cta mt-8 inline-flex">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-16">
            <div className="min-w-0 animate-rise">
              <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-border pb-3">
                <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
                  Items
                </h2>
                <Link
                  href="/shop"
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone transition-colors hover:text-teal"
                >
                  Keep shopping
                </Link>
              </div>
              {items.map((item) => (
                <CartLine
                  key={item.productUuid}
                  item={item}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>

            <aside className="animate-rise animate-rise-delay-1 lg:sticky lg:top-28 lg:self-start">
              <div className="border border-border bg-mist">
                <div className="border-b border-border px-6 py-5">
                  <p className="eyebrow">Order summary</p>
                  <p className="mt-2 font-heading text-xl font-bold tracking-tight text-ink">
                    {formatMoney(total, currencySymbol)}
                  </p>
                </div>

                <div className="space-y-3 border-b border-border px-6 py-5">
                  <div className="flex justify-between gap-4 text-[12px]">
                    <span className="text-stone">
                      {towardFree === 0
                        ? "Free shipping unlocked"
                        : `${formatMoney(towardFree, currencySymbol)} to free shipping`}
                    </span>
                    <span className="tabular-nums text-ink">{freeProgress}%</span>
                  </div>
                  <div className="h-1 overflow-hidden bg-white">
                    <div
                      className="h-full bg-teal transition-[width] duration-500"
                      style={{ width: `${freeProgress}%` }}
                    />
                  </div>
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

                <div className="space-y-3 border-t border-border px-6 py-5">
                  <Link href="/checkout" className="shop-cta w-full">
                    Checkout
                  </Link>
                  <p className="text-[12px] leading-5 text-stone">
                    Checkout requires an account. Payment is invoiced on
                    fulfillment, not charged here.
                  </p>
                  {settings.fields["shipping-note"] ? (
                    <p className="text-[12px] leading-5 text-stone">
                      {settings.fields["shipping-note"]}
                    </p>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
