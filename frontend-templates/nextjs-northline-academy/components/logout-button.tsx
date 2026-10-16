"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/logout", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        reason?: string;
      };

      if (!res.ok || data.ok === false) {
        setError("Could not revoke the backend session. Try again.");
        setPending(false);
        return;
      }

      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Network error while logging out. Session was not cleared.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={handleLogout}
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
