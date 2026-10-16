import { ensureFreshSession } from "./auth-cookies";
import { getSiteSettings } from "./content";
import { getDictionary } from "./dictionaries";
import { isLocale, type Locale } from "./i18n";
import type { AstroCookies } from "astro";

export async function resolveLocale(raw: string | undefined): Promise<Locale> {
  if (raw && isLocale(raw)) return raw;
  return "en";
}

export async function loadPageChrome(locale: Locale, cookies: AstroCookies) {
  const dictionary = getDictionary(locale);
  let siteName = "Elmapi Basic Starter";
  let description = dictionary.home.intro;
  try {
    const settings = await getSiteSettings(locale);
    siteName = settings?.fields["site-name"] || siteName;
    description =
      settings?.fields["seo-description"] ||
      settings?.fields.tagline ||
      description;
  } catch {
    // Fallbacks above are enough for chrome.
  }

  const session = await ensureFreshSession(cookies);
  return {
    dictionary,
    siteName,
    description,
    signedIn: Boolean(session?.accessToken),
    settingsTitle: siteName,
  };
}
