import { NotFoundError } from '@elmapicms/js-sdk'
import {
  getDocsNav,
  getSiteSettings,
  getVersionBySlug
} from '../../../utils/content'
import { buildPageSeo } from '../../../utils/seo'

export default defineEventHandler(async (event) => {
  const versionSlug = getRouterParam(event, 'version')
  if (!versionSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing version' })
  }

  try {
    const [settings, versionEntry, nav] = await Promise.all([
      getSiteSettings(),
      getVersionBySlug(versionSlug),
      getDocsNav(versionSlug)
    ])

    const siteName = settings.fields['site-name'] || 'Docs'
    const seo = buildPageSeo({
      settings,
      path: `/v/${versionSlug}`,
      title: `${siteName} ${versionEntry.fields.label || versionSlug}`,
      description:
        versionEntry.fields.description
        || settings.fields['seo-description']
        || settings.fields['home-intro']
        || settings.fields.tagline
    })

    return {
      siteName,
      version: versionEntry,
      nav,
      tagline: settings.fields.tagline || '',
      homeIntro: settings.fields['home-intro'] || '',
      seo
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Version not found' })
    }
    throw error
  }
})
