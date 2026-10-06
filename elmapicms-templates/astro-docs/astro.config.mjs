// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  env: {
    schema: {
      // Server secrets are read at runtime and are not inlined into the build output.
      ELMAPI_BASE_URL: envField.string({ context: 'server', access: 'secret' }),
      ELMAPI_PROJECT_ID: envField.string({ context: 'server', access: 'secret' }),
      ELMAPI_API_KEY: envField.string({ context: 'server', access: 'secret' }),
      REVALIDATE_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      CMS_CACHE_MAX_AGE: envField.number({
        context: 'server',
        access: 'public',
        optional: true,
        default: 3600,
      }),
      PUBLIC_SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
