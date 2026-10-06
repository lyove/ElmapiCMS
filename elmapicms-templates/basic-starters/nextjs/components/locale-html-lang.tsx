"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/config";

/** Keep <html lang> in sync with the active locale route. */
export function LocaleHtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
