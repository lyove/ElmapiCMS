import { defaultLocale, isLocale, locales } from '~/utils/i18n'

export default defineNuxtRouteMiddleware((to) => {
  const first = to.path.split('/').filter(Boolean)[0]
  if (first && isLocale(first)) return

  // Skip API, Nuxt internals, and static files
  if (
    to.path.startsWith('/api')
    || to.path.startsWith('/_')
    || to.path.includes('.')
  ) {
    return
  }

  const accept = import.meta.server
    ? useRequestHeaders(['accept-language'])['accept-language']
    : navigator.language

  let locale = defaultLocale
  if (accept) {
    const preferred = accept
      .split(',')
      .map(part => part.split(';')[0]?.trim().toLowerCase())
      .filter(Boolean)
    for (const lang of preferred) {
      const short = lang.split('-')[0]
      if ((locales as readonly string[]).includes(short)) {
        locale = short as typeof defaultLocale
        break
      }
    }
  }

  const suffix = to.fullPath === '/' ? '' : to.fullPath
  return navigateTo(`/${locale}${suffix}`, { redirectCode: 302 })
})
