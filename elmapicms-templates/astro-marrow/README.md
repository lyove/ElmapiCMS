# Marrow - Astro Bistro Template

A production-ready site for **Marrow**, a neighborhood modern bistro. Built with Astro 7, TypeScript, Tailwind CSS v4, and **ElmapiCMS**. Menu, story, gallery, visit info, private dining, journal, and reservation requests are editable in Elmapi.

## Requirements

- Node.js 22.12+
- npm (or pnpm / yarn)
- ElmapiCMS 4.x with a project API token (`read` for the site; `create` for reservation form submissions)

## Import the Elmapi project

1. In ElmapiCMS, click **+ New Project**.
2. Name your project and add a description if you want.
3. Choose **Import from file**.
4. Choose the `elmapi/project-astro-marrow.zip` file.
5. Click **Create Project**.

Demo content includes site settings, home page, menu categories and items, about, gallery, private dining, visit info, FAQs, journal posts, reserve page copy, and a `reservation-requests` inbox collection. Create a project API token with `read` and `create`.

## Configure environment

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `ELMAPI_BASE_URL` | Instance API root, e.g. `https://cms.example.com/api` (server secret, runtime only) |
| `ELMAPI_PROJECT_ID` | Project UUID (server secret, runtime only) |
| `ELMAPI_API_KEY` | Project Settings → API Tokens (server secret, runtime only — never `PUBLIC_`) |
| `PUBLIC_SITE_URL` | Public site origin for canonical URLs and sitemap |
| `CMS_CACHE_MAX_AGE` | CMS response cache TTL in seconds (default `3600`). Set `0` for always-live reads |
| `REVALIDATE_SECRET` | Shared secret for `POST /api/revalidate` (optional webhooks) |

Local Herd / `.test` TLS: npm scripts pass `NODE_OPTIONS=--use-system-ca` so Node trusts the system (Herd) CA. If you still see certificate errors, set `NODE_TLS_REJECT_UNAUTHORIZED=0` in the shell when running npm (do not rely on `.env` for this; Astro does not apply it to Node TLS).

Also set **Site URL** in the Elmapi **Site Settings** collection for production canonical URLs. Point **Reservation URL** to `/reserve` to use the built-in form, or an external booking link.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Deploy

This template ships with the **Node** adapter (`@astrojs/node`, standalone mode). One adapter keeps the project portable across Node hosts (Docker, a VPS, Railway, Render, Fly.io, and similar) without baking in a vendor-specific runtime. Pages fetch Elmapi at request time (through an in-process cache). The reservation form posts to `/api/reserve`.

### Node host

1. Set the env vars above in your host (required at **runtime** — Elmapi credentials are not baked into the build).
2. Ensure `ELMAPI_BASE_URL` is reachable from the runtime environment.
3. Set **Site URL** in Elmapi to your production domain.
4. Build with `npm run build`.
5. Run `npm start` (serves `dist/server/entry.mjs`) on a Node host.

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

CMS reads are cached in-process (`src/lib/cms-cache.ts`). The site always requests Elmapi with `state: published`.

| Mode | Behavior |
|------|----------|
| Default (`CMS_CACHE_MAX_AGE=3600`) | First request caches for 1 hour. Later requests reuse that until TTL expires or a webhook clears it. |
| Live editing (`CMS_CACHE_MAX_AGE=0`) | Every request hits Elmapi. Use this when webhooks are off and you want changes to show immediately after Publish. |
| Webhooks | Same 1-hour cache, but `POST /api/revalidate` clears it on publish so updates are immediate. |

**With webhooks (production):**

1. Set `REVALIDATE_SECRET` (and rebuild / restart).
2. In Elmapi: **Project settings → Webhooks → Create webhook**
   - **URL:** `https://your-site.com/api/revalidate`
   - **Secret:** must match `REVALIDATE_SECRET` (Elmapi sends `X-Webhook-Signature` HMAC-SHA256 of the body)
   - **Events:** include **publish**
3. Keep the Elmapi queue worker running.

**Publish matters:** drafts never appear on the site. Edit → **Publish** → then expect a refresh (via webhook, TTL, or `CMS_CACHE_MAX_AGE=0`). Reservation form submissions are saved as **draft** in `reservation-requests` and do not need a rebuild.

The in-process cache is per server instance. On serverless hosts (Netlify, Vercel), each function instance has its own memory. Use a short `CMS_CACHE_MAX_AGE`, or webhooks, when you need faster updates.

```bash
# Live content while webhooks are off:
# CMS_CACHE_MAX_AGE=0

npm run build && npm start
curl -X POST "http://localhost:4321/api/revalidate" -H "x-revalidate-secret: $REVALIDATE_SECRET"
```

## Customizing

**In Elmapi (content authors):**

| Collection | Purpose |
|------------|---------|
| `site-settings` | Site name, tagline, address, hours, phone, social, reservation URL, SEO defaults |
| `page-home` | Hero, thesis, featured dishes, visit CTA |
| `page-menu` | Menu page intro and SEO |
| `menu-categories` / `menu-items` | Full menu with prices, dietary tags, images |
| `page-about` | Story, pull quote, portrait and atmosphere images |
| `page-gallery` / `gallery-images` | Gallery intro and masonry images |
| `page-private-dining` | Private events copy and CTA |
| `page-visit` / `faqs` | Visit intro, map embed, FAQs |
| `page-journal` / `journal-posts` | Journal list and detail posts |
| `page-reserve` | Reserve page copy, side notes, success message |
| `reservation-requests` | Inbox for table requests from the website form (drafts) |

**In the repo (developers):**

- `src/pages/` - routes, including `/reserve`, `/api/reserve`, and `/api/revalidate`
- `src/components/` - layout, ticket menu, hero, FAQ
- `src/styles/global.css` - Marrow tokens (Plus Jakarta Sans, Manrope, forest/ember food-forward system)
- `src/lib/` - Elmapi client, CMS cache, content helpers, richtext, SEO, assets

Richtext fields may return HTML or markdown from the API. The app renders both via `renderRichText()` with a `marked` fallback.
