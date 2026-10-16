# Elmapi basic starter (Astro)

Reference Astro starter for developers wiring Elmapi into an Astro project. Stub pages and clear file layout.

Part of the [basic starters](../README.md) shared project (`en` / `de`, `site-settings`, `notes`). Same schema as Next.js and Nuxt.

## Requirements

- Node.js 22.12+
- An ElmapiCMS project. Import [`../elmapi-project-basic-starters.json`](../elmapi-project-basic-starters.json)

## Import the Elmapi project

1. In ElmapiCMS, click **+ New Project**.
2. Choose **Import from file** and select `../elmapi-project-basic-starters.json`.
3. Click **Create Project**.
4. Create a project API token with read + write abilities.

## Configure environment

Copy `.env.example` to `.env` and fill in:

| Variable | Notes |
|----------|--------|
| `ELMAPI_BASE_URL` | Instance API root, include `/api` (server secret, runtime only) |
| `ELMAPI_PROJECT_ID` | Project UUID (server secret, runtime only) |
| `ELMAPI_API_KEY` | Project API token (server secret, runtime only — never `PUBLIC_`) |
| `PUBLIC_SITE_URL` | Optional public origin |

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). Unprefixed paths redirect to `/en` or `/de`.

This starter uses Astro SSR (`output: 'server'` + `@astrojs/node`) so auth cookies and BFF routes work.

## Wiring map

| Concern | Where |
|---------|--------|
| Server CMS client (API key) | `src/lib/elmapi.ts` |
| Auth-only client | `src/lib/elmapi-auth.ts` |
| Content helpers | `src/lib/content.ts` |
| Richtext | `src/lib/rich-text.ts`, `src/components/RichText.astro` |
| Auth cookies + refresh | `src/lib/auth-cookies.ts` |
| `me()` user shape helper | `src/lib/auth-user.ts` (`{ user: { … } }` unwrap) |
| Locale redirect + account guard | `src/middleware.ts` |
| Login / register / logout / me | `src/pages/api/auth/*` |
| Notes list/get/create | `src/pages/api/notes/*` (+ server reads in pages) |
| Asset upload (+ metadata patch) | `src/pages/api/assets/upload.ts` |
| Locales + dictionaries | `src/lib/i18n.ts`, `src/lib/dictionaries.ts` |
| Pages | `src/pages/[locale]/…` |

## Auth contract (checklist)

1. Login stores access + refresh tokens in httpOnly cookies
2. Expired access tokens refresh once via `ensureFreshSession`
3. Refresh failure clears cookies and requires sign-in
4. Logout calls `client.signOut()` (backend revoke) **before** clearing cookies
5. Failed revoke returns an error and does not clear cookies
6. Project API key is never exposed with a `PUBLIC_` prefix

## Manual checks

1. Visit `/` → lands on `/en` or `/de`
2. Switch locale on a note page
3. Sign up or sign in → Account → Sign out → Sign in again
4. Create a note (auth optional; signed-in users get author fields)
5. Upload a file with alt text; confirm it appears in the asset library
6. On Notes, try filters, sort, and pagination

## Deploy notes

This starter ships with the **Node** adapter (`@astrojs/node`, standalone mode) so it stays portable across Node hosts without a vendor-specific runtime.

1. Set the env vars above on your host (required at **runtime** — Elmapi credentials are not baked into the build).
2. Keep `ELMAPI_API_KEY` server-only (no `PUBLIC_` prefix).
3. Run `npm run build` then `npm start` (or `node ./dist/server/entry.mjs`).

### Netlify, Vercel, or Cloudflare

Those platforms do not run the Node standalone server. Swap the adapter before you deploy. Keep `output: 'server'` and the `env.schema` block; change only the adapter.

Install dependencies first (`npm install`). `astro add` must load this project's `astro` package so it can resolve `astro/tsconfigs/strict`.

```bash
npm install
npx astro add netlify   # or: vercel | cloudflare
```

Or install and wire by hand (Netlify example):

```bash
npm install @astrojs/netlify
```

```js
import netlify from '@astrojs/netlify';

export default defineConfig({
  // ...keep env.schema and the rest
  adapter: netlify(),
});
```

Official adapter docs: [Node](https://docs.astro.build/en/guides/integrations-guide/node/), [Netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/), [Vercel](https://docs.astro.build/en/guides/integrations-guide/vercel/), [Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

## Customizing

- Editorial copy: Elmapi `site-settings` and `notes`
- Static UI strings: `src/lib/dictionaries.ts`
- Schema: shared project only; keep field names in sync with `src/lib/types.ts`
