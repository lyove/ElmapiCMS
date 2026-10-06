"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/config";

export function LogoutButton({
  locale,
  label,
  failedLabel,
  networkLabel,
}: {
  locale: Locale;
  label: string;
  failedLabel: string;
  networkLabel: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/logout", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean };

      if (!res.ok || data.ok === false) {
        setError(failedLabel);
        setPending(false);
        return;
      }

      await signOut({ callbackUrl: localePath(locale, "/") });
    } catch {
      setError(networkLabel);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleLogout}
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
