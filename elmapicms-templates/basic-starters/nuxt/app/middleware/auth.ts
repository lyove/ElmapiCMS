import { localePath, isLocale } from '~/utils/i18n'

export default defineNuxtRouteMiddleware(async (to) => {
  const { refresh, signedIn, loaded } = useAuth()
  if (!loaded.value) {
    await refresh()
  }
  if (signedIn.value) return

  const localeParam = String(to.params.locale || 'en')
  const locale = isLocale(localeParam) ? localeParam : 'en'
  return navigateTo({
    path: localePath(locale, '/login'),
    query: { callbackUrl: to.fullPath },
  })
})
