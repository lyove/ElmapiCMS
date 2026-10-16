# Elmapi basic starter (Next.js)

Reference App Router starter for developers wiring Elmapi into a Next.js project. Stub pages and clear file layout.

Part of the [basic starters](../README.md) shared project (`en` / `de`, `site-settings`, `notes`).

## Requirements

- Node.js 20+
- An ElmapiCMS project. Import [`../elmapi-project-basic-starters.json`](../elmapi-project-basic-starters.json)

## Import the Elmapi project

1. In ElmapiCMS, click **+ New Project**.
2. Choose **Import from file** and select `../elmapi-project-basic-starters.json`.
3. Click **Create Project**.
4. Create a project API token with read + write abilities.

## Configure environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | Notes |
|----------|--------|
| `ELMAPI_BASE_URL` | Instance API root, include `/api` |
| `ELMAPI_PROJECT_ID` | Project UUID |
| `ELMAPI_API_KEY` | Project API token (**server-only**, never `NEXT_PUBLIC_`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | Optional public origin |

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unprefixed paths redirect to `/en` or `/de` from `Accept-Language` (default `en`).

## Wiring map

| Concern | Where |
|---------|--------|
| Server CMS client (API key) | `lib/elmapi-server.ts` |
| Auth-only client (no API key) | `lib/elmapi-auth.ts` |
| List / get / filter / paginate | `lib/content.ts` |
| Richtext (HTML + markdown fallback) | `lib/rich-text.ts`, `components/rich-text.tsx` |
| Locales + dictionaries | `i18n/config.ts`, `i18n/dictionaries.ts` |
| Locale redirect + account guard | `proxy.ts` + `auth.config.ts` (edge-safe; only `/[locale]/account` is auth-gated) |
| NextAuth (credentials, refresh) | `auth.ts`, `auth.config.ts`, `app/api/auth/[...nextauth]/route.ts` |
| Logout with backend revoke | `app/api/logout/route.ts` → `client.signOut()`, then client `signOut()` |
| Sign up | `app/api/register/route.ts` |
| BFF create note | `app/api/notes/route.ts` (public; attaches author via `me()` when signed in) |
| BFF asset upload | `app/api/assets/upload/route.ts` (public BFF, server API key) |
| Advanced list filters | `lib/content.ts`, `app/[locale]/notes/page.tsx` |
| Locale pages | `app/[locale]/…` |

## Auth contract (checklist)

1. Login stores access + refresh tokens (NextAuth JWT)
2. Access token is available on the session for server BFF identity checks
3. Expired access token triggers refresh rotation in the JWT callback
4. Refresh failure sets `authError` and protected routes send you to login
5. Logout calls `POST /api/logout` which revokes the Elmapi session **before** clearing NextAuth
6. Failed revoke surfaces an error and does not clear the local session
7. Project API key is never sent to the browser

Multiple backend sessions can exist until each is revoked or expires. That is expected.

## Manual checks

1. Visit `/` → lands on `/en` or `/de`
2. Switch locale on a note page; path stays the same aside from the locale segment
3. Sign up or sign in → Account → Sign out → Sign in again
4. New note (no login required) → note appears under `/[locale]/notes/[slug]`; if signed in, author fields are set
5. Upload a file under Upload; confirm the returned asset URL
6. On Notes, try title/slug/author/`or` filters, sort, per-page, and page links

## Deploy notes

Set the same env vars on your host. Point `NEXT_PUBLIC_SITE_URL` at the production origin. Keep `ELMAPI_API_KEY` server-only. `next/image` allows your Elmapi host from `ELMAPI_BASE_URL` automatically (see `next.config.ts`).

`proxy.ts` imports only `auth.config.ts` (no Elmapi SDK). That keeps the Auth.js session check edge-safe for hosts like Netlify that bundle the Next.js proxy as an edge function. Login, refresh, and SDK calls stay in `auth.ts` on the Node server.

## Customizing

- Editorial copy and SEO defaults: Elmapi `site-settings` and `notes`
- Static UI strings: `i18n/dictionaries.ts`
- Schema changes: Elmapi dashboard or MCP; keep field names in sync with `lib/types.ts` and BFF payloads

