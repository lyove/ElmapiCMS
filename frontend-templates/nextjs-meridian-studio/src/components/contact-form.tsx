"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  submitContactForm,
  type ContactFormState,
} from "@/app/contact/actions";

type ContactFormProps = {
  submitLabel?: string;
  successMessage?: string;
};

const initialState: ContactFormState = { ok: false };

export function ContactForm({
  submitLabel = "Send message",
  successMessage = "Thanks. We'll be in touch soon.",
}: ContactFormProps) {
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialState,
  );

  if (state.ok) {
    return (
      <div className="h-fit self-start rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <p className="font-heading text-lg font-semibold">Message sent</p>
        <p className="mt-2 text-sm text-muted-foreground">{successMessage}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input id="company" name="company" placeholder="Optional" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Project details</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="Tell us about your goals, timeline, and budget range."
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="rounded-full px-8"
        disabled={pending}
      >
        {pending ? "Sending..." : submitLabel}
      </Button>
      <p className="text-xs text-muted-foreground">
        Submissions are saved as drafts in the Elmapi{" "}
        <span className="text-foreground/80">contact-submissions</span> collection.
      </p>
    </form>
  );
}
