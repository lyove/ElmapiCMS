import { ElmapiError } from '@elmapicms/js-sdk'
import type { ListNotesOptions, Locale, NoteSort } from '../../utils/types'

const SORTS: NoteSort[] = [
  'published_at:desc',
  'published_at:asc',
  'title:asc',
  'title:desc',
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = String(query.locale || 'en') as Locale
  if (locale !== 'en' && locale !== 'de') {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported locale' })
  }

  const sortValue = String(query.sort || 'published_at:desc')
  const options: ListNotesOptions = {
    page: Math.max(1, Number(query.page || 1) || 1),
    perPage: [2, 5, 10].includes(Number(query.perPage)) ? Number(query.perPage) : 5,
    sort: (SORTS as string[]).includes(sortValue) ? (sortValue as NoteSort) : 'published_at:desc',
    titleContains: String(query.title || '').trim() || undefined,
    slugEq: String(query.slug || '').trim() || undefined,
    slugContains: String(query.slugLike || '').trim() || undefined,
    authorContains: String(query.author || '').trim() || undefined,
    publishedAfter: String(query.after || '').trim() || undefined,
    matchTitleOrSlug: String(query.or || '').trim() || undefined,
  }

  if (options.slugEq) {
    options.slugContains = undefined
  }

  try {
    const [notes, total, offsetSlice] = await Promise.all([
      listNotes(locale, options),
      countNotes(locale, options),
      listNotesOffset(locale, { ...options, limit: 2, offset: 0 }),
    ])

    return {
      notes,
      total,
      offsetSlice,
      where: buildNotesWhere(options) ?? {},
      query: {
        state: 'published',
        locale,
        sort: options.sort,
        paginate: options.perPage,
        page: options.page,
        ...(buildNotesWhere(options) ? { where: buildNotesWhere(options) } : {}),
      },
    }
  }
  catch (error) {
    if (error instanceof ElmapiError) {
      throw createError({
        statusCode: error.statusCode || 502,
        statusMessage: error.message || 'Failed to list notes',
      })
    }
    throw error
  }
})
