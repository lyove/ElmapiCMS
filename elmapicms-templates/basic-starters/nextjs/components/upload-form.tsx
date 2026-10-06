"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

export function UploadForm({ dictionary }: { dictionary: Dictionary["upload"] }) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url?: string;
    uuid?: string;
    alt_text?: string | null;
  } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        error?: string;
        url?: string;
        uuid?: string;
        alt_text?: string | null;
      };

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        setPending(false);
        return;
      }

      setResult({ url: data.url, uuid: data.uuid, alt_text: data.alt_text });
      form.reset();
      setPending(false);
    } catch {
      setError("Network error.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="file" className="block text-sm font-medium">
          {dictionary.file}
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          className="block w-full text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="alt_text" className="block text-sm font-medium">
          {dictionary.alt}
        </label>
        <input
          id="alt_text"
          name="alt_text"
          type="text"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {result ? (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p>{dictionary.success}</p>
          {result.uuid ? (
            <p className="mt-1 font-mono text-xs">uuid: {result.uuid}</p>
          ) : null}
          {result.alt_text ? (
            <p className="mt-1 text-xs">alt: {result.alt_text}</p>
          ) : null}
          {result.url ? (
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all underline"
            >
              {result.url}
            </a>
          ) : null}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "…" : dictionary.submit}
      </button>
    </form>
  );
}
