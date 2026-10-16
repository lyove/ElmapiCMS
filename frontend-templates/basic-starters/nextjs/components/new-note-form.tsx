"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

export function NewNoteForm({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["newNote"];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") ?? ""),
      slug: String(form.get("slug") ?? ""),
      body: String(form.get("body") ?? ""),
      locale,
    };

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        slug?: string;
      };

      if (!res.ok) {
        setError(data.error || "Create failed.");
        setPending(false);
        return;
      }

      router.push(localePath(locale, `/notes/${data.slug}`));
      router.refresh();
    } catch {
      setError("Network error.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium">
          {dictionary.noteTitle}
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="slug" className="block text-sm font-medium">
          {dictionary.slug}
        </label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono"
          placeholder="my-note"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="body" className="block text-sm font-medium">
          {dictionary.body}
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={8}
          className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
          defaultValue={"## New note\n\nWrite markdown here."}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
