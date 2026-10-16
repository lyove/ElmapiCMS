# Cove - Nuxt SaaS Marketing Template

A production-ready marketing site for **Cove**, an async standup and weekly-update product for remote teams. Built with Nuxt, TypeScript, Tailwind CSS, Nuxt UI, and **ElmapiCMS**. Home, features, pricing, blog, changelog, about, FAQ, and contact content are editable in Elmapi.

## Requirements

- Node.js 20+
- pnpm 11+ (or npm / yarn)
- ElmapiCMS 4.x with a project API token (`read` for the site; `create` if you use the contact form)

## Import the Elmapi project

1. In ElmapiCMS, click **+ New Project**.
2. Name your project and add a description if you want.
3. Choose **Import from file**.
4. Choose the `elmapi/project-nuxt-cove.zip` file.
5. Click **Create Project**.

Demo content includes home, features, pricing plans, testimonials, customers, blog posts, changelog entries, about, FAQs, and contact copy. Create a project API token with at least `read` (`create` if you use the contact form).

## Configure environment

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `ELMAPI_BASE_URL` | Instance API root, e.g. `https://cms.example.com/api` (runtime; not baked into the build) |
| `ELMAPI_PROJECT_ID` | Project UUID (runtime) |
| `ELMAPI_API_KEY` | Project Settings → API Tokens (server-only, runtime) |
| `NUXT_PUBLIC_SITE_URL` | Public site origin for canonical URLs and sitemap |
| `REVALIDATE_SECRET` | Optional. Enables webhook cache refresh (see below) |

You can also set `NUXT_ELMAPI_*` / `NUXT_REVALIDATE_SECRET` to override `runtimeConfig` at runtime. Do not assign `process.env.ELMAPI_*` inside `nuxt.config` — that inlines secrets into the Nitro bundle.

For local Herd / self-signed TLS during development only, you may set `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env`.

Also set **Site URL** in the Elmapi **Site Settings** collection for production canonical URLs and sitemap.

## Install and run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deploy to any Node-compatible host (Vercel, Netlify, Cloudflare, Docker, etc.):

1. Set the env vars above in your host.
2. Ensure `ELMAPI_BASE_URL` is reachable from the server.
3. Set **Site URL** in Elmapi to your production domain.
4. Build with `pnpm build` and start with `pnpm preview` (or your host's Nuxt adapter).

### Cache revalidation (optional webhooks)

CMS reads are cached in-process (`server/utils/cms-cache.ts`). The site always requests Elmapi with `state: published`.

| Mode | Behavior |
|------|----------|
| Default (`CMS_CACHE_MAX_AGE=3600`) | First request caches for 1 hour. Later requests reuse that until TTL expires or a webhook clears it. |
| Live editing (`CMS_CACHE_MAX_AGE=0`) | Every request hits Elmapi. Use this when webhooks are off and you want changes to show immediately after Publish. |
| Webhooks | Same 1-hour cache, but `POST /api/revalidate` clears it on publish so updates are immediate. |

**With webhooks (production):**

1. Set `REVALIDATE_SECRET` on the host (runtime).
2. In Elmapi: **Project settings → Webhooks → Create webhook**
   - **URL:** `https://your-site.com/api/revalidate`
   - **Secret:** must match `REVALIDATE_SECRET` (Elmapi sends `X-Webhook-Signature` HMAC-SHA256 of the body)
   - **Events:** include **publish**
3. Keep the Elmapi queue worker running.

**Publish matters:** drafts never appear on the site. Edit → **Publish** → then expect a refresh (via webhook, TTL, or `CMS_CACHE_MAX_AGE=0`).

```bash
# Live content while webhooks are off (rebuild after changing env):
# CMS_CACHE_MAX_AGE=0

pnpm build && pnpm preview
curl -X POST "http://localhost:3000/api/revalidate" -H "x-revalidate-secret: $REVALIDATE_SECRET"
```

## Customizing

**In Elmapi (content authors):**

| Collection | Purpose |
|------------|---------|
| `site-settings` | Site name, SEO defaults, CTAs, footer, social links |
| `home` | Homepage hero, thesis, section titles, SEO |
| `features` / `features-page` | Feature list + detail pages |
| `pricing-plans` / `pricing-page` | Plans and pricing intro |
| `testimonials` / `customers` | Social proof |
| `changelog` / `changelog-page` | Product updates |
| `blog-posts` / `blog-categories` / `blog-authors` / `blog-page` | Blog |
| `about-page` | About copy |
| `faqs` | Pricing FAQ accordion |
| `contact-page` / `contact-submissions` | Contact copy; form saves drafts |

**In the repo (developers):**

- `app/pages/` - routes
- `app/components/` - layout and Cove UI pieces
- `app/assets/css/main.css` - Cove tokens (Inter, forest green + lime, product-led SaaS)
- `server/utils/` - Elmapi client, content helpers, richtext, SEO
- `server/api/` - server-only CMS proxies (API key never public)

Richtext fields use markdown in Elmapi and are rendered to HTML in the app (with HTML fallback when the API already returns HTML).
