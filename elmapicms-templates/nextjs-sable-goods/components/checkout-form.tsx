"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FLAT_SHIPPING,
  FREE_SHIPPING_THRESHOLD,
  type CartItem,
} from "@/lib/cart-shared";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type CheckoutFormProps = {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currencySymbol?: string;
  flatShipping?: number;
  freeShippingThreshold?: number;
  paymentNote?: string;
  shippingNote?: string;
  defaultEmail?: string;
  defaultName?: string;
};

const fieldClass =
  "w-full border border-border bg-white px-3.5 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-stone/70 focus:border-ink";

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-stone";

export function CheckoutForm({
  items,
  subtotal,
  shipping,
  total,
  currencySymbol = "$",
  flatShipping = FLAT_SHIPPING,
  freeShippingThreshold = FREE_SHIPPING_THRESHOLD,
  paymentNote,
  shippingNote,
  defaultEmail,
  defaultName,
}: CheckoutFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      shippingName: String(form.get("shippingName") ?? ""),
      shippingLine1: String(form.get("shippingLine1") ?? ""),
      shippingLine2: String(form.get("shippingLine2") ?? ""),
      shippingCity: String(form.get("shippingCity") ?? ""),
      shippingRegion: String(form.get("shippingRegion") ?? ""),
      shippingPostal: String(form.get("shippingPostal") ?? ""),
      shippingCountry: String(form.get("shippingCountry") ?? ""),
      shippingPhone: String(form.get("shippingPhone") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        uuid?: string;
        orderNumber?: string;
      };

      if (!res.ok) {
        setError(data.error || "Checkout failed.");
        setPending(false);
        return;
      }

      router.push(`/order/${data.uuid}`);
      router.refresh();
    } catch {
      setError("Network error during checkout.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-16">
      <form onSubmit={onSubmit} className="min-w-0 space-y-10">
        <section className="animate-rise space-y-5">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
            <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
              Contact
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
              01
            </span>
          </div>
          {defaultEmail ? (
            <p className="text-[14px] leading-6 text-stone">
              Confirmation goes to{" "}
              <span className="font-medium text-ink">{defaultEmail}</span>.{" "}
              <Link
                href="/account"
                className="text-ink underline-offset-4 hover:text-teal hover:underline"
              >
                Account
              </Link>
            </p>
          ) : (
            <p className="text-[14px] leading-6 text-stone">
              Signed-in account email will be used for confirmation.
            </p>
          )}
        </section>

        <section className="animate-rise animate-rise-delay-1 space-y-5">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
            <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
              Shipping address
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
              02
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="shippingName" className={labelClass}>
                Full name
              </label>
              <input
                id="shippingName"
                name="shippingName"
                defaultValue={defaultName}
                required
                autoComplete="name"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="shippingLine1" className={labelClass}>
                Address line 1
              </label>
              <input
                id="shippingLine1"
                name="shippingLine1"
                required
                autoComplete="address-line1"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="shippingLine2" className={labelClass}>
                Address line 2{" "}
                <span className="font-normal normal-case tracking-normal text-stone/70">
                  optional
                </span>
              </label>
              <input
                id="shippingLine2"
                name="shippingLine2"
                autoComplete="address-line2"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="shippingCity" className={labelClass}>
                City
              </label>
              <input
                id="shippingCity"
                name="shippingCity"
                required
                autoComplete="address-level2"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="shippingRegion" className={labelClass}>
                State / region
              </label>
              <input
                id="shippingRegion"
                name="shippingRegion"
                autoComplete="address-level1"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="shippingPostal" className={labelClass}>
                Postal code
              </label>
              <input
                id="shippingPostal"
                name="shippingPostal"
                required
                autoComplete="postal-code"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="shippingCountry" className={labelClass}>
                Country
              </label>
              <input
                id="shippingCountry"
                name="shippingCountry"
                defaultValue="US"
                autoComplete="country"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="shippingPhone" className={labelClass}>
                Phone{" "}
                <span className="font-normal normal-case tracking-normal text-stone/70">
                  optional
                </span>
              </label>
              <input
                id="shippingPhone"
                name="shippingPhone"
                type="tel"
                autoComplete="tel"
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        <section className="animate-rise animate-rise-delay-2 space-y-5">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
            <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
              Notes
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
              03
            </span>
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className={labelClass}>
              Delivery or gift note{" "}
              <span className="font-normal normal-case tracking-normal text-stone/70">
                optional
              </span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Gate code, preferred delivery window, or a short gift message."
              className={cn(fieldClass, "min-h-[6.5rem] resize-y")}
            />
          </div>
        </section>

        {error ? (
          <p
            role="alert"
            className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="shop-cta w-full sm:w-auto sm:min-w-56"
            disabled={pending || items.length === 0}
          >
            {pending ? "Placing order..." : "Place order"}
          </button>
          <Link
            href="/cart"
            className="text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-stone transition-colors hover:text-ink sm:text-left"
          >
            Back to cart
          </Link>
        </div>
      </form>

      <aside className="animate-rise animate-rise-delay-1 lg:sticky lg:top-28 lg:self-start">
        <div className="border border-border bg-mist">
          <div className="border-b border-border px-6 py-5">
            <p className="eyebrow">Order summary</p>
            <p className="mt-2 font-heading text-xl font-bold tracking-tight text-ink">
              {formatMoney(total, currencySymbol)}
            </p>
          </div>

          <ul className="divide-y divide-border px-6">
            {items.map((item) => (
              <li key={item.productUuid} className="flex gap-4 py-4">
                <div className="relative size-16 shrink-0 overflow-hidden bg-white">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-stone">
                      Item
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[12px] text-stone">
                    Qty {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-[13px] tabular-nums text-ink">
                  {formatMoney(item.price * item.quantity, currencySymbol)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="space-y-2.5 border-t border-border px-6 py-5 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-stone">Subtotal</dt>
              <dd className="tabular-nums text-ink">
                {formatMoney(subtotal, currencySymbol)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone">Shipping</dt>
              <dd className="tabular-nums text-ink">
                {shipping === 0 ? "Free" : formatMoney(shipping, currencySymbol)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3 text-[15px] font-semibold">
              <dt className="text-ink">Total</dt>
              <dd className="tabular-nums text-ink">
                {formatMoney(total, currencySymbol)}
              </dd>
            </div>
          </dl>

          <div className="space-y-3 border-t border-border px-6 py-5 text-[12px] leading-5 text-stone">
            <p>
              Flat shipping {formatMoney(flatShipping, currencySymbol)}. Free
              over {formatMoney(freeShippingThreshold, currencySymbol)}.
            </p>
            {shippingNote ? <p>{shippingNote}</p> : null}
            {paymentNote ? <p>{paymentNote}</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
