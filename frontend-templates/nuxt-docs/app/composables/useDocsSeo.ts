export function useDocsSeo(seo: MaybeRefOrGetter<{
  title?: string
  description?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogUrl?: string
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  canonical?: string
} | null | undefined>) {
  const value = computed(() => toValue(seo))

  useSeoMeta({
    title: () => value.value?.title,
    description: () => value.value?.description,
    ogTitle: () => value.value?.ogTitle,
    ogDescription: () => value.value?.ogDescription,
    ogImage: () => value.value?.ogImage,
    ogUrl: () => value.value?.ogUrl,
    twitterCard: () => value.value?.twitterCard,
    twitterTitle: () => value.value?.twitterTitle,
    twitterDescription: () => value.value?.twitterDescription,
    twitterImage: () => value.value?.twitterImage
  })

  useHead({
    link: computed(() =>
      value.value?.canonical
        ? [{ rel: 'canonical', href: value.value.canonical }]
        : []
    )
  })
}
