import { createHmac, timingSafeEqual } from 'node:crypto'
import { getCmsCacheGeneration, invalidateCmsCache } from '../utils/cms-cache'

/**
 * Webhook endpoint for Elmapi publish/update events.
 * Invalidates the process-local CMS cache so the next request refetches Elmapi.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const env = typeof process !== 'undefined' ? process.env : undefined
  const secret = String(
    env?.['REVALIDATE_SECRET']
    || env?.['NUXT_REVALIDATE_SECRET']
    || config.revalidateSecret
    || ''
  ).trim()

  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'REVALIDATE_SECRET is not configured'
    })
  }

  const rawBody = (await readRawBody(event, false)) || ''
  const bodyText = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')

  if (!verifyWebhookAuth(bodyText, event, secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid secret' })
  }

  const generation = invalidateCmsCache()

  try {
    const storage = useStorage('cache')
    const keys = await storage.getKeys()
    await Promise.all(keys.map(key => storage.removeItem(key)))
  } catch {
    // ignore storage drivers that do not support listing
  }

  setResponseHeaders(event, {
    'Cache-Control': 'no-store'
  })

  return {
    ok: true,
    revalidatedAt: new Date().toISOString(),
    generation,
    cacheGeneration: getCmsCacheGeneration()
  }
})

function verifyWebhookAuth(
  rawBody: string,
  event: Parameters<typeof getHeader>[0],
  secret: string
) {
  const headerSecret
    = getHeader(event, 'x-revalidate-secret')
      || getHeader(event, 'x-elmapi-secret')
      || getHeader(event, 'x-webhook-secret')
      || ''
  if (headerSecret && secretsMatch(headerSecret, secret)) return true

  const query = getQuery(event)
  const querySecret = String(query.secret || '')
  if (querySecret && secretsMatch(querySecret, secret)) return true

  const signature = getHeader(event, 'x-webhook-signature') || ''
  if (!signature || !rawBody) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return secretsMatch(signature, expected)
}

function secretsMatch(a: string, b: string) {
  try {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    return left.length === right.length && timingSafeEqual(left, right)
  } catch {
    return false
  }
}
