"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CartItem } from "@/lib/cart-shared";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CartLine({
  item,
  currencySymbol = "$",
}: {
  item: CartItem;
  currencySymbol?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function updateQuantity(quantity: number) {
    setPending(true);
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        productUuid: item.productUuid,
        quantity,
      }),
    });
    setPending(false);
    router.refresh();
  }

  async function removeLine() {
    setPending(true);
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        productUuid: item.productUuid,
      }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <article
      className={cn(
        "grid gap-4 border-b border-border py-6 sm:grid-cols-[7rem_1fr_auto] sm:items-start sm:gap-6",
        pending && "opacity-60",
      )}
    >
      <Link
        href={`/shop/${item.slug}`}
        className="relative aspect-square w-full max-w-28 overflow-hidden bg-mist sm:max-w-none"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 hover:scale-[1.03]"
            sizes="112px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-stone">
            Item
          </div>
        )}
      </Link>

      <div className="min-w-0 space-y-3">
        <div>
          <Link
            href={`/shop/${item.slug}`}
            className="font-heading text-[16px] font-bold tracking-tight text-ink transition-colors hover:text-teal"
          >
            {item.title}
          </Link>
          <p className="mt-1 text-[13px] text-stone">
            {formatMoney(item.price, currencySymbol)} each
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-10 items-center border border-border bg-white">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="grid h-full w-10 place-items-center text-stone transition-colors hover:text-ink disabled:opacity-40"
              disabled={pending || item.quantity <= 1}
              onClick={() => updateQuantity(item.quantity - 1)}
            >
              −
            </button>
            <span className="min-w-8 text-center text-[13px] font-medium tabular-nums text-ink">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="grid h-full w-10 place-items-center text-stone transition-colors hover:text-ink disabled:opacity-40"
              disabled={pending || item.quantity >= 12}
              onClick={() => updateQuantity(item.quantity + 1)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={removeLine}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone transition-colors hover:text-ink"
          >
            Remove
          </button>
        </div>
      </div>

      <p className="text-left text-[15px] font-medium tabular-nums text-ink sm:pt-1 sm:text-right">
        {formatMoney(item.price * item.quantity, currencySymbol)}
      </p>
    </article>
  );
}
