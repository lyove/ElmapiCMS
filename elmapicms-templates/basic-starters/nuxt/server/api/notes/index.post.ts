import {
  AuthenticationError,
  ElmapiError,
  ValidationError,
} from '@elmapicms/js-sdk'
import type { Locale } from '../../utils/types'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    title?: string
    slug?: string
    body?: string
    locale?: string
  }>(event)

  const title = String(body?.title ?? '').trim()
  const slug = String(body?.slug ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')
  const markdown = String(body?.body ?? '').trim()
  const locale = String(body?.locale ?? 'en').trim() as Locale

  if (!title || !slug || !markdown) {
    throw createError({
      statusCode: 400,
      statusMessage: 'title, slug, and body are required.',
    })
  }
  if (locale !== 'en' && locale !== 'de') {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported locale.' })
  }

  let authorName: string | undefined
  let authorUserId: string | undefined

  const session = await ensureFreshSession(event)
  if (session?.accessToken) {
    try {
      const authClient = createAuthClient(session)
      const me = (await authClient.me()) as Record<string, unknown>
      authorUserId = String(me.uuid ?? me.id ?? '') || undefined
      authorName
        = (me.display_name as string | undefined)
          || (me.email as string | undefined)
          || 'Project user'
    }
    catch (error) {
      if (!(error instanceof AuthenticationError)) {
        throw createError({
          statusCode: 502,
          statusMessage: 'Could not verify identity.',
        })
      }
    }
  }

  try {
    const elmapi = useElmapiServer()
    const entry = (await elmapi.content.create('notes', {
      data: {
        title,
        slug,
        body: markdown,
        ...(authorName ? { 'author-name': authorName } : {}),
        ...(authorUserId ? { 'author-user-id': authorUserId } : {}),
        'seo-title': title,
        'seo-description': title,
      },
      state: 'published',
      locale,
    })) as { uuid: string }

    return {
      ok: true,
      uuid: entry.uuid,
      slug,
      locale,
      authorAttached: Boolean(authorUserId),
    }
  }
  catch (error) {
    if (error instanceof ValidationError) {
      throw createError({
        statusCode: 422,
        statusMessage: error.message || 'Validation failed.',
        data: error.details,
      })
    }
    if (error instanceof ElmapiError) {
      throw createError({
        statusCode: error.statusCode || 400,
        statusMessage: error.message || 'Create failed.',
      })
    }
    throw error
  }
})
