"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

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

export function RegisterForm({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["auth"];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setVerifyToken(null);

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
        setVerifyToken(data.verification_token || "(no token returned)");
        setPending(false);
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
          setError(
            "Account created, but starting the session failed. Please sign in.",
          );
          setPending(false);
          router.push(localePath(locale, "/login"));
          return;
        }

        router.push(localePath(locale, "/account"));
        router.refresh();
        return;
      }

      router.push(localePath(locale, "/login"));
    } catch {
      setError("Network error during registration.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="display_name" className="block text-sm font-medium">
          {dictionary.displayName}
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          {dictionary.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          {dictionary.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {verifyToken ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Email verification is required. Your app owns delivery of this token:{" "}
          <code className="break-all">{verifyToken}</code>
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "…" : dictionary.submitRegister}
      </button>
    </form>
  );
}
