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

export function formatTitle(
  settings: ContentEntry<SiteSettingsFields>,
  pageTitle?: string
): string {
  const siteName = settings.fields['site-name'] || 'Docs'
  if (!pageTitle) {
    return settings.fields['seo-title'] || siteName
  }
  return `${pageTitle} | ${siteName}`
}

export function buildPageSeo(options: {
  settings: ContentEntry<SiteSettingsFields>
  title?: string
  description?: string
  path?: string
  imageUrl?: string | null
}) {
  const { settings, title, description, path = '', imageUrl } = options
  const base = resolveSiteUrl(settings)
  const normalized = path === '/' ? '' : path
  const canonical = `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`
  const defaultDescription = settings.fields['seo-description']
  const defaultOg = assetUrl(settings.fields['og-image'])
  const ogImage = imageUrl || defaultOg || undefined

  const metaTitle = formatTitle(settings, title)
  const metaDescription
    = description || defaultDescription || settings.fields.tagline || ''

  return {
    title: metaTitle,
    description: metaDescription,
    ogTitle: metaTitle,
    ogDescription: metaDescription,
    ogImage,
    ogUrl: canonical,
    twitterCard: 'summary_large_image' as const,
    twitterTitle: metaTitle,
    twitterDescription: metaDescription,
    twitterImage: ogImage,
    canonical
  }
}
