"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterResponse = {
  ok?: boolean;
  error?: string;
  verification_required?: boolean;
  verification_token?: string;
  needs_login?: boolean;
  email?: string;
  userId?: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      display_name: String(form.get("display_name") ?? ""),
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as RegisterResponse;

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setPending(false);
        return;
      }

      if (data.verification_required) {
        const params = new URLSearchParams({ email: data.email || payload.email });
        if (data.verification_token) {
          params.set("token", data.verification_token);
        }
        router.push(`/verify-email?${params.toString()}`);
        return;
      }

      if (data.accessToken) {
        // Prefer session from signup tokens. Do not call password sign-in again.
        const result = await signIn("elmapi", {
          email: data.email || payload.email,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || "",
          expiresAt: data.expiresAt || "",
          name: data.name || "",
          userId: data.userId || "",
          redirect: false,
        });

        if (result?.error) {
          setError("Account created, but starting the session failed. Please sign in.");
          setPending(false);
          router.push("/login");
          return;
        }

        router.push("/members");
        router.refresh();
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Network error during registration.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
