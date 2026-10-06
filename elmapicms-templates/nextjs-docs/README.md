# Documentation - Next.js Docs / Help Center Template

A production-ready documentation site and help center powered by **ElmapiCMS**. Categories, versions, and markdown articles live in Elmapi, drive the sidebar, and render with syntax-highlighted code, callouts, and a table of contents. Built with Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui.

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
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `ELMAPI_BASE_URL` | Your instance API root, e.g. `https://cms.example.com/api` |
| `ELMAPI_PROJECT_ID` | Project UUID |
| `ELMAPI_API_KEY` | Project Settings -> API Access (server-only, never expose to the browser) |
| `NEXT_PUBLIC_SITE_URL` | Optional fallback site URL for local canonical/OG tags |
| `REVALIDATE_SECRET` | Optional. Enables webhook cache refresh (see below) |
| `REVALIDATION_COLLECTION_IDS` | Optional JSON map of Elmapi `collection_id` to slug |

For local Herd/`.test` instances with self-signed TLS, add `NODE_TLS_REJECT_UNAUTHORIZED=0` to `.env.local` during development only.

Also set **Site URL** in the Elmapi **Site Settings** collection for production canonical URLs and sitemap.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to the default version (for example `/v/1.0`).

## Deploy

Deploy to any Node-compatible host (Vercel, Netlify, Docker, etc.):

1. Set the env vars above in your hosting dashboard.
2. Ensure `ELMAPI_BASE_URL` is reachable from the server.
3. `next/image` allows your Elmapi host from `ELMAPI_BASE_URL` automatically (see `next.config.ts`).
4. Set **Site URL** in Elmapi Site Settings to your production domain.

### Cache revalidation (optional webhooks)

**Without webhooks** (default): the root layout sets `export const revalidate = 3600`, so Next.js refreshes pages from the API on the next visit after 1 hour.

**With webhooks** (optional): keep the hourly ISR baseline, and point an Elmapi webhook at `POST /api/revalidate` with `REVALIDATE_SECRET` so publish/update events refresh immediately.

## Customizing

**In Elmapi (content authors):**

| Collection | Purpose |
|------------|---------|
| `site-settings` (singleton) | Site name, tagline, site URL, home intro, SEO defaults, optional OG image |
| `doc-versions` | Version labels/slugs for the switcher (`is-default` marks the redirect target) |
| `doc-categories` | Sidebar sections: title, slug, description, sort order, **Default open** (sidebar starts expanded or collapsed) |
| `doc-articles` | Articles: title, slug, summary, **markdown** body, category, version, sort order, SEO |

Article bodies use richtext `editor.mode: markdown` and `outputFormat: markdown`. The site renders markdown with:

- Syntax-highlighted code blocks via `rehype-pretty-code` + `@rehype-pretty/transformers` copy button (same stack as the Elmapi website)
- GitHub-style callouts: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`
- Heading-based table of contents
- Versioned article routes at `/v/{version}/{slug}` (no `/docs` segment). Rename `app/v` if you want a different base path.

Sidebar order comes from category and article **Sort Order** fields. **Default open** on each category controls the first-visit expand state; clicking a category opens its submenu, and the user’s open/collapsed choice is remembered in `localStorage`. The site title lives in the sidebar; the version switcher is on the left of the page header. The whole page chrome is capped at `97rem` by default; use the header width control for optional full-viewport layout (saved in `localStorage`). Theme follows system preference with a manual light/dark toggle.

**In the repo (developers):**

- `app/v/[version]/` - versioned home, articles, categories
- `components/markdown.tsx` - markdown pipeline
- `components/docs-shell.tsx` - sidebar, header, search
- `lib/content.ts` - Elmapi fetch helpers and nav builder
- `app/globals.css` - light/dark tokens (Geist)
