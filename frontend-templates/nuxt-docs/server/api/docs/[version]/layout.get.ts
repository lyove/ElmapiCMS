import { NotFoundError } from '@elmapicms/js-sdk'
import {
  getDocsNav,
  getSearchIndex,
  getSiteSettings,
  getVersionBySlug,
  getVersions
} from '../../../utils/content'

export default defineEventHandler(async (event) => {
  const versionSlug = getRouterParam(event, 'version')
  if (!versionSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing version' })
  }

  try {
    const [settings, version, versions, nav, searchItems] = await Promise.all([
      getSiteSettings(),
      getVersionBySlug(versionSlug),
      getVersions(),
      getDocsNav(versionSlug),
      getSearchIndex(versionSlug)
    ])

    return {
      siteName: settings.fields['site-name'] || 'Docs',
      version,
      versions,
      nav,
      searchItems
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Version not found' })
    }
    throw error
  }
})
