# Northline Academy - Next.js Membership Learning Hub

A production-ready membership learning hub with public marketing pages, guided learning paths, instructor profiles, and gated member lessons. Built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, NextAuth, and **ElmapiCMS** project user auth. Site copy, paths, instructors, testimonials, course outcomes, plans, FAQs, and SEO are editable in Elmapi.

## Requirements

- Node.js 18+
- ElmapiCMS 4.x instance with a project API token (`read` ability minimum)
- npm, pnpm, or yarn

## Import the Elmapi project

1. In ElmapiCMS, click "+ New Project".
2. Name your project and add a description if you want.
3. Choose "Import from file".
4. Choose the `elmapi/project-northline-academy.zip` file.
5. Click "Create Project".

Demo content includes public and member-only courses, two guided learning paths, instructor profiles, testimonials, plans, and FAQs. Create a project API token with at least `read`.

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

## Auth

Northline uses Elmapi **project user auth** with NextAuth (Auth.js) and a custom credentials provider. Project user auth works out of the box after import; there is nothing to enable in Elmapi.

If the project requires **email verification**, the app surfaces `verification_token` from sign-up (and blocked auth) on `/verify-email`. Your production app must deliver that token (email/SMS). This starter shows the token in the verify UI for local demos when Elmapi returns it. If verification is not required, sign-up can return access/refresh tokens and the app starts a session without a second password login.

### Flow

| Action | Behavior |
|--------|----------|
| Sign up | `POST /api/register` calls Elmapi `signUp`. If tokens are returned, NextAuth creates a session from those tokens (no second password sign-in). If verification is required, redirect to `/verify-email`. |
| Sign in | NextAuth credentials provider calls `signInWithPassword`, stores access + refresh tokens in the JWT. |
| Refresh | JWT callback calls `refreshSession()` when `expiresAt` is past, and persists rotated tokens. |
| Sign out | Client calls `POST /api/logout`, which revokes the Elmapi backend session via `signOut()`, then clears the NextAuth session. Cookie-clear-only logout is not used. |
| Member routes | `/members` is protected in `proxy.ts` and again in `app/members/layout.tsx`. Failed refresh redirects to `/login`. |
| Header session UI | Marketing layout stays cacheable for ISR/webhooks. Header login state is read client-side; server `auth()` stays on member/gated routes only. |

### Public vs member content

- Public routes: `/`, `/about`, `/pricing`, `/contact`, `/courses`, `/courses/[slug]`, `/paths`, `/paths/[slug]`, `/instructors`, `/instructors/[slug]`
- Auth routes (noindex): `/login`, `/register`, `/verify-email`
- Private routes (noindex): `/members`
- Courses with `member-only = true` show teaser + CTA to anonymous visitors; signed-in members see the full richtext body.
- Learning paths can also be member-only. Anonymous visitors see the path overview and membership gate; signed-in members see its introduction and ordered course sequence.

## Deploy

Deploy to any Node-compatible host (Vercel, Netlify, Docker, etc.):

1. Set the env vars above in your hosting dashboard.
2. Ensure `ELMAPI_BASE_URL` is reachable from the server.
3. `next/image` allows your Elmapi host from `ELMAPI_BASE_URL` automatically (see `next.config.ts`).
4. Set **Site URL** in Elmapi Site Settings to your production domain.

`proxy.ts` imports only `auth.config.ts` (no Elmapi SDK). That keeps the Auth.js session check edge-safe for hosts like Netlify that bundle the Next.js proxy as an edge function. Login, refresh, and SDK calls stay in `auth.ts` on the Node server.

### Cache revalidation (optional webhooks)

**Without webhooks** (default): `app/layout.tsx` sets `export const revalidate = 3600`, so Next.js refreshes public CMS pages from the API after 1 hour.

**With webhooks** (optional): the 1-hour ISR timer stays as a baseline, and Elmapi can notify the site on publish/update so affected pages refresh immediately.

1. Set `REVALIDATE_SECRET` in hosting and `.env.local`.
2. Redeploy after setting the secret.
3. In Elmapi: **Project settings -> Webhooks -> Create webhook**
   - **URL:** `https://your-site.com/api/revalidate`
   - **Secret:** same as `REVALIDATE_SECRET`
   - **Events:** publish, update, unpublish, trash, delete, restore
   - **Include Payload:** on

## Customizing

**In Elmapi (content authors):**

| Collection | Purpose |
|------------|---------|
| `site-settings` (singleton) | Site name, tagline, nav, SEO defaults, contact email, member CTA |
| `home-page` (singleton) | Hero, featured copy, path/instructor/story headings, membership pitch, highlights, SEO |
| `about-page` (singleton) | Mission, values, approach steps, team/CTA copy, hero image, SEO |
| `pricing-page` (singleton) | Pricing intro and FAQ heading |
| `contact-page` (singleton) | Contact copy |
| `plans` | Pricing tiers with features and CTAs |
| `faqs` | Pricing FAQ answers (markdown richtext) |
| `categories` | Course categories |
| `courses` | Catalog entries with cover, body, teaser, outcomes, lesson count, instructor/category relations, `member-only` flag, SEO |
| `learning-paths` | Ordered course sequences with cover, lead instructor, level, duration, member gate, SEO |
| `instructors` | Public profiles with portrait, expertise, biography, featured state, SEO |
| `testimonials` | Member quotes and avatars used on the home page |

**In the repo (developers):**

- `app/` - routes and page composition
- `proxy.ts` - member-route redirect guard (Next.js 16 proxy; edge-safe via `auth.config.ts`)
- `auth.config.ts` - edge-safe Auth.js session config for the proxy
- `auth.ts` - NextAuth + Elmapi credentials/refresh (Node only)
- `app/api/logout` - backend session revoke
- `components/` - UI sections and auth forms
- `lib/content.ts` - Elmapi fetch helpers
- `lib/seo.ts` - metadata, canonical, OG/Twitter
- `app/globals.css` - light Studio Campus theme tokens (Fraunces + Manrope, navy/coral palette)

Third-party demo images are listed in `ATTRIBUTIONS.md`.
