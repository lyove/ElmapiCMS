type CoveSeoInput = {
  title?: string
  description?: string
  path?: string
  imageUrl?: string | null
  siteName?: string
  siteUrl?: string
  defaultDescription?: string
  defaultOgImage?: string | null
}

export function useCoveSeo(input: CoveSeoInput) {
  const config = useRuntimeConfig()
  const siteName = input.siteName || 'Cove'
  const base = (
    input.siteUrl
    || config.public.siteUrl
    || 'http://localhost:3000'
  ).replace(/\/$/, '')
  const path = input.path || ''
  const canonical = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const title = input.title
    ? (input.title.includes(siteName) ? input.title : `${input.title} · ${siteName}`)
    : siteName
  const description = input.description || input.defaultDescription || ''
  const ogImage = input.imageUrl || input.defaultOgImage || undefined

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogUrl: canonical,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImage
  })

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
    meta: [{ name: 'robots', content: 'index, follow' }]
  })
}

export function firstAssetUrl(value: unknown): string | null {
  if (!value) return null
  if (Array.isArray(value)) {
    const first = value[0] as { url?: string } | undefined
    return first?.url || null
  }
  if (typeof value === 'object' && value !== null && 'url' in value) {
    return (value as { url?: string }).url || null
  }
  return null
}

export function planFeatureLines(features?: string) {
  if (!features) return []
  return features
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

/** Normalize enumeration fields that may return a string or string[]. */
export function enumValue(value: unknown, fallback = ''): string {
  if (Array.isArray(value)) return String(value[0] || fallback)
  if (typeof value === 'string') return value || fallback
  return fallback
}

export function asGroupList<T extends Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}
