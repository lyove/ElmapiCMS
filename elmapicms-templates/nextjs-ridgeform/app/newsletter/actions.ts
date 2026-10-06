"use server";

import { ValidationError } from "@elmapicms/js-sdk";
import { elmapi } from "@/lib/elmapi-server";

export type NewsletterFormState = {
  ok: boolean;
  error?: string;
};

function asTrimmedString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function submitNewsletterForm(
  _prev: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  const email = asTrimmedString(formData.get("email"));

  if (!email) {
    return { ok: false, error: "Please enter your email address." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    await elmapi.content.create("newsletter-subscribers", {
      state: "draft",
      data: {
        email,
        source: "website-footer",
      },
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false,
        error: "That email looks invalid. Please check and try again.",
      };
    }
    console.error("Newsletter signup failed", error);
    return {
      ok: false,
      error: "Something went wrong. Please try again later.",
    };
  }
}
