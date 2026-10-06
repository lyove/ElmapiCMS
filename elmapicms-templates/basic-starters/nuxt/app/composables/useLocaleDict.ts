import { getDictionary } from '~/utils/dictionaries'
import { isLocale, type Locale } from '~/utils/i18n'

export function useLocaleDict() {
  const route = useRoute()
  const locale = computed<Locale>(() => {
    const raw = String(route.params.locale || 'en')
    return isLocale(raw) ? raw : 'en'
  })
  const dictionary = computed(() => getDictionary(locale.value))
  return { locale, dictionary }
}
