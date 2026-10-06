"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  submitNewsletterForm,
  type NewsletterFormState,
} from "@/app/newsletter/actions";

const initialState: NewsletterFormState = { ok: false };

type NewsletterFormProps = {
  title?: string;
  description?: string;
};

export function NewsletterForm({ title, description }: NewsletterFormProps) {
  const [state, formAction, pending] = useActionState(
    submitNewsletterForm,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold md:text-3xl">
        {title || "Subscribe to our newsletter!"}
      </h2>
      {description ? (
        <p className="mt-3 max-w-md text-sm text-white/65">{description}</p>
      ) : null}

      {state.ok ? (
        <p
          className="mt-6 border border-safety/40 bg-safety/15 px-4 py-3 text-sm text-safety"
          role="status"
        >
          Thanks. You are on the list.
        </p>
      ) : (
        <form
          ref={formRef}
          action={formAction}
          className="mt-6 flex gap-0"
          noValidate
        >
          <input
            type="email"
            name="email"
            required
            placeholder="ENTER YOUR EMAIL"
            className="h-12 flex-1 border-0 bg-white px-4 text-sm text-ink outline-none"
            aria-label="Email for newsletter"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending}
            className="h-12 bg-safety px-6 text-xs font-bold uppercase tracking-wider text-ink disabled:opacity-60"
          >
            {pending ? "..." : "Go"}
          </button>
        </form>
      )}

      {state.error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
