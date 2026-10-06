"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShoppingBag, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";

export function AuthNav({ cartCount = 0 }: { cartCount?: number }) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && !session?.authError;
  const [count, setCount] = useState(cartCount);

  useEffect(() => {
    setCount(cartCount);
  }, [cartCount]);

  useEffect(() => {
    let cancelled = false;
    async function refreshCount() {
      try {
        const res = await fetch("/api/cart");
        if (!res.ok) return;
        const data = (await res.json()) as {
          items?: { quantity?: number }[];
        };
        if (cancelled) return;
        const next = (data.items ?? []).reduce(
          (sum, item) => sum + Math.max(0, Number(item.quantity ?? 0)),
          0,
        );
        setCount(next);
      } catch {
        // keep last known count
      }
    }

    function onFocus() {
      void refreshCount();
    }

    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link
        href={signedIn ? "/account" : "/login"}
        aria-label={signedIn ? "Account" : "Sign in"}
        className="flex size-10 items-center justify-center text-ink transition-colors hover:text-teal"
      >
        <UserRound className="size-[18px]" strokeWidth={1.5} />
      </Link>
      <Link
        href="/cart"
        aria-label={
          count > 0 ? `Cart, ${count} items` : "Cart, empty"
        }
        className="relative flex size-10 items-center justify-center text-ink transition-colors hover:text-teal"
      >
        <ShoppingBag className="size-[18px]" strokeWidth={1.5} />
        {count > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal px-1 text-[10px] font-bold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
      {signedIn ? (
        <div className="hidden sm:block">
          <LogoutButton />
        </div>
      ) : null}
    </div>
  );
}
