"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyEmailForm({
  initialToken = "",
  email,
}: {
  initialToken?: string;
  email?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const token = String(form.get("token") ?? "");

    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setPending(false);
        return;
      }

      setSuccess(true);
      setPending(false);
      router.push("/login?verified=1");
    } catch {
      setError("Network error during verification.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {email ? (
        <p className="text-sm text-muted-foreground">
          Confirm the verification token for <strong>{email}</strong>. In
          production your app delivers this token by email or SMS. For local
          demos, Elmapi may return the token in the sign-up response.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="token">Verification token</Label>
        <Input
          id="token"
          name="token"
          type="text"
          defaultValue={initialToken}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? (
        <p className="text-sm text-primary">Email verified. Redirecting...</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Confirming..." : "Confirm email"}
      </Button>
    </form>
  );
}
