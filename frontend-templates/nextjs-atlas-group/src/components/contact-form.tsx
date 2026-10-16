"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { submitContactForm, type ContactFormState } from "@/app/[locale]/contact/actions";

type ContactFormProps = {
  locale: Locale;
  nameLabel: string;
  emailLabel: string;
  messageLabel: string;
  submitLabel: string;
  sendingLabel: string;
  successHeading: string;
  successMessage: string;
  errorMessage: string;
};

const initialState: ContactFormState = { ok: false };

export function ContactForm({
  locale,
  nameLabel,
  emailLabel,
  messageLabel,
  submitLabel,
  sendingLabel,
  successHeading,
  successMessage,
  errorMessage,
}: ContactFormProps) {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  if (state.ok) {
    return (
      <div className="h-fit self-start rounded-lg border border-accent/30 bg-accent/5 p-6">
        <p className="font-heading text-lg font-semibold">{successHeading}</p>
        <p className="mt-2 text-sm text-muted-foreground">{successMessage}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-2">
        <Label htmlFor="name">{nameLabel}</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{emailLabel}</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">{messageLabel}</Label>
        <Textarea id="message" name="message" required rows={6} />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="rounded-lg px-8" disabled={pending}>
        {pending ? sendingLabel : submitLabel}
      </Button>
    </form>
  );
}
