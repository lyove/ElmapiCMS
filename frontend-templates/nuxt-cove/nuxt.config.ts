// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: 'cove-color-mode'
  },

  /**
   * Keep defaults empty / non-secret so values are not baked into the Nitro build.
   * Runtime: `NUXT_ELMAPI_*` map onto these keys; server utils also read `ELMAPI_*`.
   */
  runtimeConfig: {
    elmapiBaseUrl: '',
    elmapiProjectId: '',
    elmapiApiKey: '',
    revalidateSecret: '',
    // Seconds to cache published CMS reads in-process. 0 = always fetch live.
    cmsCacheMaxAge: 3600,
    public: {
      siteUrl: 'http://localhost:3000'
    }
  },

  // CMS caching is process-local in server/utils/cms-cache.ts, cleared by
  // POST /api/revalidate. Avoid Nitro routeRules SWR: its in-memory layer is
  // not reliably purged by useStorage('cache').clear().
  routeRules: {
    '/api/revalidate': {
      swr: false,
      headers: { 'Cache-Control': 'no-store' }
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
