import { ElmapiError } from '@elmapicms/js-sdk'
import type { Locale } from '../utils/types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = (String(query.locale || 'en') as Locale)
  if (locale !== 'en' && locale !== 'de') {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported locale' })
  }

  try {
    const settings = await getSiteSettings(locale)
    return settings
  }
  catch (error) {
    if (error instanceof ElmapiError) {
      throw createError({
        statusCode: error.statusCode || 502,
        statusMessage: error.message || 'Failed to load settings',
      })
    }
    throw error
  }
})
