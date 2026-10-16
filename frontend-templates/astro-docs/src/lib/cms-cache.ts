import { CMS_CACHE_MAX_AGE } from 'astro:env/server';

type CacheEntry = {
  expires: number;
  data: unknown;
};

const store = new Map<string, CacheEntry>();
let generation = 0;

function resolveMaxAgeSeconds(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override)) {
    return Math.max(0, override);
  }

  return Math.max(0, CMS_CACHE_MAX_AGE);
}

/**
 * Bump generation and drop in-process CMS responses.
 * Called by POST /api/revalidate after a signed Elmapi webhook.
 */
export function invalidateCmsCache(): number {
  generation += 1;
  store.clear();
  return generation;
}

export function getCmsCacheGeneration(): number {
  return generation;
}

/**
 * Process-local cache for Elmapi reads.
 * Set CMS_CACHE_MAX_AGE=0 to disable (always live).
 * Webhooks clear this via invalidateCmsCache().
 */
export async function cachedCms<T>(
  key: string,
  fn: () => Promise<T>,
  maxAgeSeconds?: number,
): Promise<T> {
  const ttl = resolveMaxAgeSeconds(maxAgeSeconds);
  if (ttl <= 0) {
    return fn();
  }

  const fullKey = `${generation}:${key}`;
  const hit = store.get(fullKey);
  if (hit && hit.expires > Date.now()) {
    return hit.data as T;
  }

  const data = await fn();
  store.set(fullKey, {
    expires: Date.now() + ttl * 1000,
    data,
  });
  return data;
}
