# Sable Goods - Next.js Design-Led Storefront

A production-ready ecommerce storefront for design-led home goods. Built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, NextAuth, and **ElmapiCMS** for content, project user auth, and order records. Product catalog, pages, FAQ, and site settings are editable in Elmapi. Checkout is account-only with invoice / pay on fulfillment (no Stripe).

## Requirements

- Node.js 18+
- ElmapiCMS 4.x instance with a project API token (`read` minimum; `create`/`update` for orders)
- npm, pnpm, or yarn

## Import the Elmapi project

1. In ElmapiCMS, click "+ New Project".
2. Name your project and add a description if you want.
3. Choose "Import from file".
4. Choose the `elmapi/project-sable-goods.zip` file.
5. Click "Create Project".

Demo content includes products, categories, home page copy, about/shipping/privacy/terms pages, FAQ items, blog posts, and site settings. Create a project API token with at least `read` and `create` on the `orders` collection.

## Configure environment

Copy the example env file and fill in your project credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `ELMAPI_BASE_URL` | Your instance API root, e.g. `https://cms.example.com/api` |
| `ELMAPI_PROJECT_ID` | Project UUID |
| `ELMAPI_API_KEY` | Project Settings -> API Tokens (server-only, never expose to the browser) |
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
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

Open [http://localhost:3000](http://localhost:3000).

## Commerce

Sable Goods is a **headless storefront** with honest, low-friction checkout:

| Rule | Behavior |
|------|----------|
| Account-only checkout | Guest checkout is not supported. `/checkout` requires sign-in. |
| No card payments | The primary CTA is **Place order**. Payment is invoiced on fulfillment. |
| Cart | Cookie-backed cart (`sable-cart`) via `GET/POST/DELETE /api/cart`. |
| Orders | `POST /api/checkout` validates the session with `me()`, re-prices cart lines from CMS, creates a published `orders` entry with `pending_payment` status, then clears the cart. |
| Shipping | Flat fee and free-shipping threshold from **Site Settings** (`flat-shipping`, `free-shipping-threshold`). |
| Order numbers | `SG-` prefix with timestamp-based code. |

Orders land in the Elmapi **`orders`** collection with a repeatable **line-items** group (product relation, title, slug, quantity, unit price, image URL), totals, customer fields (`customer-user-id`, `customer-name`, `customer-email`), shipping address, and payment note snapshot. Staff can update status in Elmapi (`placed`, `pending_payment`, `confirmed`, `fulfilled`, `cancelled`).

### Plugging in a PSP later

This template intentionally skips Stripe or card capture. To add a payment provider:

1. Keep order creation in Elmapi as the source of truth.
2. After `POST /api/checkout`, redirect to your PSP checkout session instead of (or in addition to) the confirmation page.
3. On PSP webhook success, patch the order status to `confirmed` via the Elmapi API.
4. Replace or supplement the payment note in **Site Settings** with PSP-specific copy.

## Auth

Sable Goods uses Elmapi **project user auth** with NextAuth (Auth.js) and a custom credentials provider.

If the project requires **email verification**, the app surfaces `verification_token` from sign-up on `/verify-email`. Your production app must deliver that token (email/SMS). This starter shows the token in the verify UI for local demos when Elmapi returns it.

### Flow

| Action | Behavior |
|--------|----------|
| Sign up | `POST /api/register` calls Elmapi `signUp`. If tokens are returned, NextAuth creates a session from those tokens. If verification is required, redirect to `/verify-email`. |
| Sign in | NextAuth credentials provider calls `signInWithPassword`, stores access + refresh tokens in the JWT. |
| Refresh | JWT callback calls `refreshSession()` when `expiresAt` is past. |
| Sign out | Client calls `POST /api/logout`, which revokes the Elmapi backend session via `signOut()`, then clears the NextAuth session. |
| Protected routes | `/checkout` and `/account` are guarded in `proxy.ts` and again in page components. |

### Public vs private routes

- Public: `/`, `/shop`, `/shop/[slug]`, `/about`, `/shipping`, `/privacy`, `/terms`, `/faq`, `/blog`
- Auth routes (noindex): `/login`, `/register`, `/verify-email`
- Private routes (noindex): `/account`, `/checkout`, `/cart`, `/order/[uuid]`

## Deploy

Deploy to any Node-compatible host (Vercel, Netlify, Docker, etc.):

1. Set the env vars above in your hosting dashboard.
2. Ensure `ELMAPI_BASE_URL` is reachable from the server.
3. `next/image` allows your Elmapi host from `ELMAPI_BASE_URL` automatically (see `next.config.ts`).
4. Set **Site URL** in Elmapi Site Settings to your production domain.

`proxy.ts` imports only `auth.config.ts` (no Elmapi SDK). That keeps the Auth.js session check edge-safe for hosts like Netlify that bundle the Next.js proxy as an edge function. Login, refresh, and SDK calls stay in `auth.ts` on the Node server.

### Cache revalidation (optional webhooks)

**Without webhooks** (default): `app/layout.tsx` sets `export const revalidate = 3600`, so Next.js refreshes public CMS pages after 1 hour.

**With webhooks** (optional): set `REVALIDATE_SECRET`, redeploy, then in Elmapi create a webhook to `https://your-site.com/api/revalidate` with the same secret and publish/update events.

## Customizing

**In Elmapi (content authors):**

| Collection | Purpose |
|------------|---------|
| `site-settings` (singleton) | Site name, SEO, currency, contact, footer, shipping/payment notes, shipping rates |
| `home-page` (singleton) | Hero, featured and category headings, SEO |
| `categories` | Shop categories with image, sort order, and optional parent for subcategories |
| `products` | Catalog with price, stock, gallery, category relation, richtext description |
| `pages` | About, shipping policy, and other static pages |
| `faq-items` | FAQ accordion content |
| `blog-posts` | Blog posts (title, slug, excerpt, body, cover, topic, SEO) |
| `orders` | Created at checkout (not hand-authored) |

**In the repo (developers):**

- `app/` - routes and page composition
- `proxy.ts` - checkout/account redirect guard (edge-safe via `auth.config.ts`)
- `auth.config.ts` - edge-safe Auth.js session config for the proxy
- `auth.ts` - NextAuth + Elmapi credentials/refresh (Node only)
- `app/api/checkout` - order creation BFF
- `app/api/cart` - cookie cart mutations
- `components/` - storefront UI and auth forms
- `lib/content.ts` - Elmapi fetch helpers
- `lib/cart.ts` - cart cookie and shipping math
- `app/globals.css` - Sable palette and type (Montserrat, white/mist furniture-shop look, teal accents)

Third-party demo images are listed in `ATTRIBUTIONS.md`.
