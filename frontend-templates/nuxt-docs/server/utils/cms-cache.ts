type CacheEntry = {
  expires: number
  data: unknown
}

const store = new Map<string, CacheEntry>()
let generation = 0

function resolveMaxAgeSeconds(override?: number) {
  if (typeof override === 'number' && Number.isFinite(override)) {
    return Math.max(0, override)
  }
  try {
    const env = typeof process !== 'undefined' ? process.env : undefined
    const fromEnv = env?.['CMS_CACHE_MAX_AGE'] || env?.['NUXT_CMS_CACHE_MAX_AGE']
    const configured = Number(
      fromEnv ?? useRuntimeConfig().cmsCacheMaxAge
    )
    if (Number.isFinite(configured)) return Math.max(0, configured)
  } catch {
    // useRuntimeConfig unavailable outside a request context
  }
  return 3600
}

/**
 * Bump generation and drop in-process CMS responses.
 * Called by POST /api/revalidate after a signed Elmapi webhook.
 */
export function invalidateCmsCache() {
  generation += 1
  store.clear()
  return generation
}

export function getCmsCacheGeneration() {
  return generation
}

/**
 * Process-local cache for Elmapi reads.
 * Set CMS_CACHE_MAX_AGE=0 to disable (always live).
 * Webhooks clear this via invalidateCmsCache().
 */
export async function cachedCms<T>(
  key: string,
  fn: () => Promise<T>,
  maxAgeSeconds?: number
): Promise<T> {
  const ttl = resolveMaxAgeSeconds(maxAgeSeconds)
  if (ttl <= 0) {
    return fn()
  }

  const fullKey = `${generation}:${key}`
  const hit = store.get(fullKey)
  if (hit && hit.expires > Date.now()) {
    return hit.data as T
  }

  const data = await fn()
  store.set(fullKey, {
    expires: Date.now() + ttl * 1000,
    data
  })
  return data
}
