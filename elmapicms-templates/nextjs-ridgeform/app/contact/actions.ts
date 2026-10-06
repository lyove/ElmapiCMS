"use server";

import { ValidationError } from "@elmapicms/js-sdk";
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
  const phone = asTrimmedString(formData.get("phone"));
  const company = asTrimmedString(formData.get("company"));
  const projectType = asTrimmedString(formData.get("project-type"));
  const message = asTrimmedString(formData.get("message"));

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in your name, email, and message." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    await elmapi.content.create("contact-submissions", {
      state: "draft",
      data: {
        name,
        email,
        phone: phone || undefined,
        company: company || undefined,
        "project-type": projectType || undefined,
        message,
        source: "website",
      },
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false,
        error: "Some fields look invalid. Please check and try again.",
      };
    }
    console.error("Contact form submission failed", error);
    return {
      ok: false,
      error: "Something went wrong. Please try again or email us directly.",
    };
  }
}
