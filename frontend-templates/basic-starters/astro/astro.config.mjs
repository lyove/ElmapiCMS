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
