# Meridian Studio — Next.js Creative Agency Template

A production-ready marketing site for creative studios and agencies. Built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and **ElmapiCMS**. Content — hero, services, portfolio, team, testimonials, insights, contact, and SEO defaults — is fully editable in Elmapi.

## Requirements

- Node.js 18+
- ElmapiCMS 4.x instance with a project API token (`read` ability minimum; `admin` only needed if you modify schema)
- npm, pnpm, or yarn

## Import the Elmapi project

1. In ElmapiCMS, click "+ New Project".
2. Name your project and add description if you want.
3. Chose "Import from file"
4. Choose the `elmapi/project-meridian-studio.zip` file.
5. Click "Create Project".

## Configure environment

Copy the example env file and fill in your project credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `ELMAPI_BASE_URL` | Your instance API root, e.g. `https://cms.example.com/api` |
| `ELMAPI_PROJECT_ID` | Project UUID |
| `ELMAPI_API_KEY` | Project Settings -> API Access (server-only — never expose to the browser) |
| `NEXT_PUBLIC_SITE_URL` | Optional fallback site URL for local dev canonical/OG tags |
| `REVALIDATE_SECRET` | Optional. Enables webhook cache refresh (see below) |
| `REVALIDATION_COLLECTION_IDS` | Optional JSON map of Elmapi `collection_id` → slug (for delete webhooks) |

For local Herd/`.test` instances with self-signed TLS, add `NODE_TLS_REJECT_UNAUTHORIZED=0` to `.env.local` during development only.

**Local images:** Laravel Herd serves `*.test` on `127.0.0.1`. Next.js 16 blocks optimizing images that resolve to private IPs. This template sets `images.dangerouslyAllowLocalIP` in development — restart `npm run dev` after changing `next.config.ts`.

Also set **Site URL** in the Elmapi **Site Settings** collection for production canonical URLs and sitemap.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deploy to any Node-compatible host (Vercel, Netlify, Docker, etc.):

1. Set the env vars above in your hosting dashboard.
2. Ensure `ELMAPI_BASE_URL` is reachable from the server.
3. `next/image` allows your Elmapi host from `ELMAPI_BASE_URL` automatically (see `next.config.ts`).
4. Set **Site URL** in Elmapi to your production domain.


### Cache revalidation (optional webhooks)

**Without webhooks** (default): the root layout sets `export const revalidate = 3600`, so Next.js refreshes pages from the API on the next visit after 1 hour. No extra setup required.

**With webhooks** (optional): the 1-hour ISR timer keeps running as a baseline, and Elmapi additionally notifies the site on publish/update so the affected pages refresh immediately instead of waiting for the next hour.

To enable webhooks:

1. Add the secret to your hosting environment (and `.env.local` for local testing):

   ```env
   REVALIDATE_SECRET=your-long-random-secret
   ```

2. **Redeploy** after setting `REVALIDATE_SECRET`. The API route only accepts webhook requests once this is set.

3. In Elmapi: **Project settings → Webhooks → Create webhook**
   - **URL:** `https://your-site.com/api/revalidate`
   - **Secret:** same as `REVALIDATE_SECRET`
   - **Events:** publish, update, unpublish, trash, delete, restore
   - **Include Payload:** on

## Customizing

**In Elmapi (content authors):**

| Collection | Purpose |
|------------|---------|
| `site-settings` | Site name, nav, SEO defaults, contact info, social links |
| `home-hero` | Homepage hero copy, CTAs, stats, background image |
| `services` | Capabilities with details, deliverables, and related work |
| `case-studies` | Portfolio / work: challenge, approach, outcome, results metrics, gallery, services, SEO |
| `team-members` | Team bios and photos |
| `testimonials` | Client quotes |
| `insights` | Blog posts (category, author relation, SEO) |
| `faqs` | Contact page FAQ |
| `contact-page` | Contact heading, intro, form labels |
| `contact-submissions` | Inbound leads from the contact form (saved as drafts) |

**In the repo (developers):**

- `src/app/` — routes and page composition
- `src/components/` — UI sections
- `src/lib/content.ts` — Elmapi fetch helpers
- `src/lib/seo.ts` — metadata, canonical, OG/Twitter
- `src/app/globals.css` — theme tokens (Syne + DM Sans, dark editorial palette)

The contact form posts to Elmapi via a server action (`src/app/contact/actions.ts`). Entries land as **drafts** in `contact-submissions` so they stay out of the public site. Your project API token needs **create** ability. Review new leads in the Elmapi admin under Contact Submissions.