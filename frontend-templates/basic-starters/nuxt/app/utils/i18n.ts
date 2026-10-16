export const locales = ['en', 'de'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export function localePath(locale: Locale, path = '') {
  const normalized
    = path === '/' || path === ''
      ? ''
      : path.startsWith('/')
        ? path
        : `/${path}`
  return `/${locale}${normalized}`
}
