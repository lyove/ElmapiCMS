"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  slug,
  inStock = true,
  label = "Add to cart",
  showQuantity = false,
}: {
  slug: string;
  inStock?: boolean;
  label?: string;
  showQuantity?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    if (!inStock) return;
    setPending(true);
    setError(null);
    setAdded(false);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          slug,
          quantity: showQuantity ? quantity : 1,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || "Could not add to cart.");
        setPending(false);
        return;
      }

      setPending(false);
      setAdded(true);
      router.refresh();
    } catch {
      setError("Network error.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {showQuantity && inStock ? (
          <div className="inline-flex h-12 items-center border border-border bg-white">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="grid h-full w-11 place-items-center text-stone transition-colors hover:text-ink disabled:opacity-40"
              disabled={quantity <= 1 || pending}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="min-w-10 text-center text-[13px] font-medium tabular-nums text-ink">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="grid h-full w-11 place-items-center text-stone transition-colors hover:text-ink disabled:opacity-40"
              disabled={quantity >= 12 || pending}
              onClick={() => setQuantity((q) => Math.min(12, q + 1))}
            >
              +
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className={cn(
            "shop-cta h-12 w-full sm:min-w-52 sm:flex-1",
            !inStock && "cursor-not-allowed opacity-50 hover:border-ink hover:bg-ink",
          )}
          disabled={!inStock || pending}
          onClick={handleAdd}
        >
          {pending ? "Adding..." : inStock ? label : "Out of stock"}
        </button>
      </div>

      {added ? (
        <p className="text-[13px] text-ink">
          Added to bag.{" "}
          <button
            type="button"
            className="font-medium underline underline-offset-4 hover:text-teal"
            onClick={() => router.push("/cart")}
          >
            View cart
          </button>
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
