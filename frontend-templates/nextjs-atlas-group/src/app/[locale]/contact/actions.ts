"use server";

import { ValidationError } from "@elmapicms/js-sdk";
import { isLocale, type Locale } from "@/i18n/config";
import { elmapi } from "@/lib/elmapi-server";

export type ContactFormState = {
  ok: boolean;
  error?: string;
};

function asTrimmedString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const name = asTrimmedString(formData.get("name"));
  const email = asTrimmedString(formData.get("email"));
  const message = asTrimmedString(formData.get("message"));
  const rawLocale = asTrimmedString(formData.get("locale"));
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  if (!name || !email || !message) {
    return { ok: false, error: "missing" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid-email" };
  }

  try {
    await elmapi.content.create("contact-submissions", {
      state: "draft",
      data: { name, email, message, locale },
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, error: "invalid-email" };
    }
    console.error("Contact form submission failed", error);
    return { ok: false, error: "server" };
  }
}
