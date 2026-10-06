import { assetUrl } from './assets'
import type { ContentEntry, SiteSettingsFields } from './types'

export function resolveSiteUrl(settings?: ContentEntry<SiteSettingsFields> | null) {
  const config = useRuntimeConfig()
  return (
    settings?.fields['site-url']?.replace(/\/$/, '')
    || config.public.siteUrl?.replace(/\/$/, '')
    || 'http://localhost:3000'
  )
}

export function buildPageSeo(options: {
  settings: ContentEntry<SiteSettingsFields>
  title?: string
  description?: string
  path?: string
  imageUrl?: string | null
}) {
  const { settings, title, description, path = '', imageUrl } = options
  const siteName = settings.fields['site-name'] || 'Cove'
  const base = resolveSiteUrl(settings)
  const canonical = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const pageTitle = title
    ? (title.includes(siteName) ? title : `${title} · ${siteName}`)
    : (settings.fields['seo-title'] || siteName)
  const metaDescription
    = description
      || settings.fields['seo-description']
      || ''
  const ogImage
    = imageUrl
      || assetUrl(settings.fields['og-image'])
      || undefined

  return {
    title: pageTitle,
    description: metaDescription,
    ogTitle: pageTitle,
    ogDescription: metaDescription,
    ogImage,
    ogUrl: canonical,
    twitterCard: 'summary_large_image' as const,
    twitterTitle: pageTitle,
    twitterDescription: metaDescription,
    twitterImage: ogImage,
    canonical
  }
}
