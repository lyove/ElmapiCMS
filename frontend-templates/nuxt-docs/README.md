# Documentation - Nuxt Docs Template

A production-ready documentation site and help center powered by **ElmapiCMS**. Categories, versions, and markdown articles live in Elmapi, drive the sidebar, and render with syntax-highlighted code, callouts, and a table of contents. Built with Nuxt 4, TypeScript, Tailwind CSS, and Nuxt UI.

## Requirements

- Node.js 18+
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

Nuxt loads `.env` from the project root (not `.env.local`).

| Variable | Description |
|----------|-------------|
| `ELMAPI_BASE_URL` | Your instance API root, e.g. `https://cms.example.com/api` (runtime; not baked into the build) |
| `ELMAPI_PROJECT_ID` | Project UUID (runtime) |
| `ELMAPI_API_KEY` | Project Settings -> API Access (server-only, runtime — never expose to the browser) |
| `NUXT_PUBLIC_SITE_URL` | Optional fallback site URL for local canonical/OG tags |
| `REVALIDATE_SECRET` | Optional. Enables webhook cache refresh (see below) |
| `CMS_CACHE_MAX_AGE` | Optional. Seconds to cache published CMS reads in-process (default `3600`, `0` = always live) |

You can also set `NUXT_ELMAPI_*` / `NUXT_REVALIDATE_SECRET` / `NUXT_CMS_CACHE_MAX_AGE` to override `runtimeConfig` at runtime. Do not assign `process.env.ELMAPI_*` inside `nuxt.config` — that inlines secrets into the Nitro bundle.

For local Herd/`.test` instances with self-signed TLS, add `NODE_TLS_REJECT_UNAUTHORIZED=0` to `.env` during development only.

Also set **Site URL** in the Elmapi **Site Settings** collection for production canonical URLs and sitemap.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to the default version (for example `/v/1.0`).

## Deploy

Deploy to any Node-compatible host (Vercel, Netlify, Docker, etc.):

1. Set the env vars above in your hosting dashboard (required at **runtime**).
2. Ensure `ELMAPI_BASE_URL` is reachable from the server.
3. Set **Site URL** in Elmapi Site Settings to your production domain.

### Cache revalidation (optional webhooks)

**Without webhooks** (default): published CMS reads are cached in-process for `CMS_CACHE_MAX_AGE` seconds (default 1 hour).

**With webhooks** (optional): point an Elmapi webhook at `POST /api/revalidate` with `REVALIDATE_SECRET` so publish/update events clear the cache immediately.

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
- Versioned article routes at `/v/{version}/{slug}` (no `/docs` segment). Rename `app/pages/v` if you want a different base path.

Sidebar order comes from category and article **Sort Order** fields. **Default open** on each category controls the first-visit expand state; clicking a category opens its submenu, and the user's open/collapsed choice is remembered in `localStorage`. The site title lives in the sidebar; the version switcher is on the left of the page header. The whole page chrome is capped at `97rem` by default; use the header width control for optional full-viewport layout (saved in `localStorage`). Theme follows system preference with a manual light/dark toggle.

**In the repo (developers):**

- `app/pages/v/[version]/` - versioned home, articles, categories
- `server/utils/markdown.ts` - unified markdown pipeline
- `app/components/DocsShell.vue` - sidebar, header, search
- `server/utils/content.ts` - Elmapi fetch helpers and nav builder
- `app/assets/css/main.css` - light/dark tokens
