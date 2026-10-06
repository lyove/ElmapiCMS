import { createClient } from '@elmapicms/js-sdk'

type ElmapiServerClient = ReturnType<typeof createClient>

let _client: ElmapiServerClient | null = null
let _clientKey = ''

/**
 * Resolve Elmapi server config without baking secrets into the build.
 * Prefer live process.env (ELMAPI_* / NUXT_ELMAPI_*), then runtimeConfig.
 */
function resolveElmapiConfig() {
  const config = useRuntimeConfig()
  const env = typeof process !== 'undefined' ? process.env : undefined

  const baseUrl = String(
    env?.['ELMAPI_BASE_URL']
    || env?.['NUXT_ELMAPI_BASE_URL']
    || config.elmapiBaseUrl
    || ''
  ).trim()
  const projectId = String(
    env?.['ELMAPI_PROJECT_ID']
    || env?.['NUXT_ELMAPI_PROJECT_ID']
    || config.elmapiProjectId
    || ''
  ).trim()
  const apiKey = String(
    env?.['ELMAPI_API_KEY']
    || env?.['NUXT_ELMAPI_API_KEY']
    || config.elmapiApiKey
    || ''
  ).trim()

  return { baseUrl, projectId, apiKey }
}

export function useElmapiServer() {
  const { baseUrl, projectId, apiKey } = resolveElmapiConfig()

  if (!baseUrl || !projectId || !apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing ELMAPI_BASE_URL, ELMAPI_PROJECT_ID, or ELMAPI_API_KEY'
    })
  }

  const nextKey = `${baseUrl}|${projectId}|${apiKey}`
  if (!_client || _clientKey !== nextKey) {
    _client = createClient({
      baseUrl,
      projectId,
      apiKey
    })
    _clientKey = nextKey
  }

  return _client
}
