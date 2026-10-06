# Documentation - Astro Docs / Help Center Template

A production-ready documentation site and help center powered by **ElmapiCMS**. Categories, versions, and markdown articles live in Elmapi, drive the sidebar, and render with syntax-highlighted code, callouts, and a table of contents. Built with Astro, TypeScript, Tailwind CSS, and the Node SSR adapter.

## Requirements

- Node.js 22.12+
- ElmapiCMS 4.x instance with a project API token (`read` ability minimum)
- npm, pnpm, or yarn

## Import the Elmapi project

1. In ElmapiCMS, click "+ New Project".
2. Name your project and add a description if you want.
3. Choose "Import from file".
4. Choose the `elmapi/project-nextjs-docs.json` file.
5. Click "Create Project".

Demo content includes versions `1.0` and `2.0`, plus Getting started (including All features), Guides, Concepts, and API reference articles. Create a project API token with at least `read`.

## Configure environment

Copy the example env file and fill in your project credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `ELMAPI_BASE_URL` | Your instance API root, e.g. `https://cms.example.com/api` (server secret, runtime only) |
| `ELMAPI_PROJECT_ID` | Project UUID (server secret, runtime only) |
| `ELMAPI_API_KEY` | Project Settings -> API Access (server secret, runtime only — never expose to the browser) |
| `PUBLIC_SITE_URL` | Optional fallback site URL for local canonical/OG tags |
| `REVALIDATE_SECRET` | Optional. Enables webhook cache refresh (see below) |
| `CMS_CACHE_MAX_AGE` | Optional. Seconds to cache published CMS reads in-process (default `3600`, `0` = always live) |

For local Herd/`.test` instances with self-signed TLS, start the dev server with TLS verification disabled (development only):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
```

Also set **Site URL** in the Elmapi **Site Settings** collection for production canonical URLs and sitemap.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). The app redirects to the default version (for example `/v/1.0`).

## Deploy

This template ships with the **Node** adapter (`@astrojs/node`, standalone mode). One adapter keeps the project portable across Node hosts (Docker, a VPS, Railway, Render, Fly.io, and similar) without baking in a vendor-specific runtime.

### Node host

1. Set the env vars above in your hosting dashboard (required at **runtime** — Elmapi credentials are not baked into the build).
2. Ensure `ELMAPI_BASE_URL` is reachable from the server.
3. Set **Site URL** in Elmapi Site Settings to your production domain.
4. Run `npm run build` then `npm start` (or `node ./dist/server/entry.mjs`).

### Netlify, Vercel, or Cloudflare

Those platforms do not run the Node standalone server. Swap the adapter before you deploy. Keep `output: 'server'` and the `env.schema` block; change only the adapter.

Install dependencies first (`npm install`). `astro add` must load this project's `astro` package so it can resolve `astro/tsconfigs/strict`.

**Netlify**

```bash
npm install
npx astro add netlify
```

Or install and wire it by hand:

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

You can remove `@astrojs/node` from `package.json` after the swap if you no longer need it.

Set `ELMAPI_*` (and optional `REVALIDATE_SECRET`) in the site env, then deploy with Git or the Netlify CLI.

**Vercel**

```bash
npm install
npx astro add vercel
```

**Cloudflare**

```bash
npm install
npx astro add cloudflare
```

Official adapter docs: [Node](https://docs.astro.build/en/guides/integrations-guide/node/), [Netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/), [Vercel](https://docs.astro.build/en/guides/integrations-guide/vercel/), [Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

### Cache revalidation (optional webhooks)

**Without webhooks** (default): published CMS reads are cached in-process for `CMS_CACHE_MAX_AGE` seconds (default 1 hour).

**With webhooks** (optional): point an Elmapi webhook at `POST /api/revalidate` with `REVALIDATE_SECRET` so publish/update events clear the cache immediately.

The in-process cache is per server instance. On serverless hosts (Netlify, Vercel), each function instance has its own memory. Use a short `CMS_CACHE_MAX_AGE`, or webhooks, when you need faster updates.

## Customizing

**In Elmapi (content authors):**

| Collection | Purpose |
|------------|---------|
| `site-settings` (singleton) | Site name, tagline, site URL, home intro, SEO defaults, optional OG image |
| `doc-versions` | Version labels/slugs for the switcher (`is-default` marks the redirect target) |
| `doc-categories` | Sidebar sections: title, slug, description, sort order, **Default open** (sidebar starts expanded or collapsed) |
| `doc-articles` | Articles: title, slug, summary, **markdown** body, category, version, sort order, SEO |

Article bodies use richtext `editor.mode: markdown` and `outputFormat: markdown`. The site renders markdown with:

- Syntax-highlighted code blocks via `rehype-pretty-code` + `@rehype-pretty/transformers` copy button
- GitHub-style callouts: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`
- Heading-based table of contents
- Versioned article routes at `/v/{version}/{slug}` (no `/docs` segment). Rename `src/pages/v` if you want a different base path.

Sidebar order comes from category and article **Sort Order** fields. **Default open** on each category controls the first-visit expand state; clicking a category opens its submenu, and the user's open/collapsed choice is remembered in `localStorage`. The site title lives in the sidebar; the version switcher is on the left of the page header. The whole page chrome is capped at `97rem` by default; use the header width control for optional full-viewport layout (saved in `localStorage`). Theme follows system preference with a manual light/dark toggle.

**In the repo (developers):**

- `src/pages/v/[version]/` - versioned home, articles, categories
- `src/lib/markdown.ts` - unified markdown pipeline
- `src/layouts/DocsLayout.astro` - sidebar, header, search
- `src/lib/content.ts` - Elmapi fetch helpers and nav builder
- `src/styles/global.css` - light/dark tokens
