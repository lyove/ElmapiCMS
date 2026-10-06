import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CheckoutForm } from "@/components/checkout-form";
import { cartTotals, getCart } from "@/lib/cart";
import { getSiteSettings, shippingRatesFromSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Checkout",
    description: "Place your Sable Goods order.",
    path: "/checkout",
    robots: { index: false, follow: false },
  });
}

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.accessToken || session.authError) {
    redirect("/login?callbackUrl=/checkout");
  }

  const [items, settings] = await Promise.all([getCart(), getSiteSettings()]);
  if (items.length === 0) {
    redirect("/cart");
  }

  const currencySymbol = settings.fields["currency-symbol"] || "$";
  const rates = shippingRatesFromSettings(settings);
  const totals = cartTotals(items, rates);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <section className="border-b border-border bg-mist">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="animate-rise">
              <p className="eyebrow">Account checkout</p>
              <h1 className="section-title mt-3">Checkout</h1>
              <p className="section-lead mt-3 max-w-lg">
                Confirm shipping, then place your order. Payment is invoiced on
                fulfillment, not charged here.
              </p>
            </div>
            <ol className="animate-rise animate-rise-delay-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              <li>
                <Link href="/cart" className="text-stone transition-colors hover:text-ink">
                  Cart
                </Link>
              </li>
              <li aria-hidden className="text-stone/40">
                /
              </li>
              <li className="text-teal">Checkout</li>
              <li aria-hidden className="text-stone/40">
                /
              </li>
              <li className="text-stone/50">Confirmation</li>
            </ol>
          </div>
          <p className="mt-6 text-[12px] text-stone">
            {itemCount} {itemCount === 1 ? "item" : "items"} in this order ·{" "}
            <Link href="/cart" className="text-ink underline-offset-4 hover:text-teal hover:underline">
              Edit cart
            </Link>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <CheckoutForm
          items={items}
          subtotal={totals.subtotal}
          shipping={totals.shipping}
          total={totals.total}
          currencySymbol={currencySymbol}
          flatShipping={rates.flatShipping}
          freeShippingThreshold={rates.freeShippingThreshold}
          paymentNote={settings.fields["payment-note"]}
          shippingNote={settings.fields["shipping-note"]}
          defaultEmail={session.user?.email || undefined}
          defaultName={session.user?.name || undefined}
        />
      </div>
    </div>
  );
}
