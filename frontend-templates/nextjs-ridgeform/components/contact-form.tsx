"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitContactForm,
  type ContactFormState,
} from "@/app/contact/actions";

type ContactFormProps = {
  submitLabel?: string;
  successMessage?: string;
};

const initialState: ContactFormState = { ok: false };

const projectTypes = [
  "New Build",
  "Renovation",
  "Addition",
  "Commercial",
  "Other",
];

export function ContactForm({
  submitLabel = "Send inquiry",
  successMessage = "Thanks. We will reply within two business days.",
}: ContactFormProps) {
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialState,
  );

  if (state.ok) {
    return (
      <div className="border border-safety bg-safety/10 p-6">
        <p className="font-heading text-lg font-bold uppercase">Inquiry received</p>
        <p className="mt-2 text-sm text-muted-foreground">{successMessage}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs uppercase tracking-wider">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Your name"
            className="h-11 rounded-none border-border bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs uppercase tracking-wider">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="h-11 rounded-none border-border bg-white"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs uppercase tracking-wider">
            Phone
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Optional"
            className="h-11 rounded-none border-border bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company" className="text-xs uppercase tracking-wider">
            Company
          </Label>
          <Input
            id="company"
            name="company"
            placeholder="Optional"
            className="h-11 rounded-none border-border bg-white"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-type" className="text-xs uppercase tracking-wider">
          Project type
        </Label>
        <select
          id="project-type"
          name="project-type"
          defaultValue=""
          className="h-11 w-full rounded-none border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-safety"
        >
          <option value="">Select one</option>
          {projectTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message" className="text-xs uppercase tracking-wider">
          Message
        </Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Property address, scope, and target timeline."
          className="rounded-none border-border bg-white"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="btn-cta btn-cta-dark h-12 w-full rounded-none border-0 bg-ink text-xs font-bold uppercase tracking-wider text-white hover:bg-safety hover:text-ink"
      >
        {pending ? "Sending..." : submitLabel}
      </Button>
    </form>
  );
}
