"use client";

import { useRouter } from "next/navigation";
import { FormEvent } from "react";
import type { ShopSearchParams } from "@/lib/shop-params";
import { shopHref } from "@/lib/shop-url";

export function ShopPriceFilter({
  params,
}: {
  params: ShopSearchParams;
}) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const min = String(formData.get("min") ?? "").trim();
    const max = String(formData.get("max") ?? "").trim();
    router.push(
      shopHref(params, {
        min: min || undefined,
        max: max || undefined,
      }),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number"
        name="min"
        min={0}
        step="0.01"
        placeholder="Min"
        defaultValue={params.min ?? ""}
        className="w-full border border-border bg-white px-3 py-2 text-[13px] text-ink placeholder:text-stone focus:border-teal focus:outline-none"
      />
      <span className="text-stone">-</span>
      <input
        type="number"
        name="max"
        min={0}
        step="0.01"
        placeholder="Max"
        defaultValue={params.max ?? ""}
        className="w-full border border-border bg-white px-3 py-2 text-[13px] text-ink placeholder:text-stone focus:border-teal focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 border border-ink px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
      >
        Go
      </button>
    </form>
  );
}
