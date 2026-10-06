import { ElmapiError } from '@elmapicms/js-sdk'
import type { Locale } from '../../utils/types'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const locale = String(query.locale || 'en') as Locale

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }
  if (locale !== 'en' && locale !== 'de') {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported locale' })
  }

  try {
    const note = await getNoteBySlug(locale, slug)
    if (!note) {
      throw createError({ statusCode: 404, statusMessage: 'Note not found' })
    }
    return {
      note,
      html: richTextToHtml(note.fields.body),
    }
  }
  catch (error) {
    if (error instanceof ElmapiError) {
      throw createError({
        statusCode: error.statusCode || 502,
        statusMessage: error.message || 'Failed to load note',
      })
    }
    throw error
  }
})
