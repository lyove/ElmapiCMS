# Atlas Group - Next.js Multilingual Company Site & Blog Template

A production-ready marketing site and blog for a global market-expansion consultancy. Built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and **ElmapiCMS**, with full `en` / `de` / `es` localization. Content for home, about, services, case studies, locations, blog, contact, FAQ, and SEO defaults is fully editable in Elmapi.

## Requirements

- Node.js 18+
- ElmapiCMS 4.x instance with a project API token (`read` ability minimum; `create` to accept contact submissions; `admin` only needed if you modify schema)
- npm, pnpm, or yarn

## Import the Elmapi project

1. In ElmapiCMS, click "+ New Project".
2. Name your project and add a description if you want.
3. Choose "Import from file".
4. Choose the `elmapi/project-atlas-group.zip` file.
5. Click "Create Project".

Demo content for `en`, `de`, and `es` is included. Create a project API token with at least `read` (and `create` if you want the contact form to save submissions).

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
| `NEXT_PUBLIC_SITE_URL` | Optional fallback site URL for local dev canonical/OG tags |
| `REVALIDATE_SECRET` | Optional. Enables webhook cache refresh (see below) |
| `REVALIDATION_COLLECTION_IDS` | Optional JSON map of Elmapi `collection_id` to slug (for delete webhooks) |

For local Herd/`.test` instances with self-signed TLS, add `NODE_TLS_REJECT_UNAUTHORIZED=0` to `.env.local` during development only.

Also set **Site URL** in the Elmapi **Site Settings** collection (per locale, if it differs) for production canonical URLs and sitemap.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to your browser's preferred locale (`/en`, `/de`, or `/es`), falling back to `/en`.

## Locales

- Supported: `en` (default), `de`, `es`. Add or change these under **Project settings -> Localization** in Elmapi; keep `src/i18n/config.ts` in sync if you add more.
- Every route is locale-prefixed (`/en/services`, `/de/services`, `/es/services`, ...). There is no unprefixed route; visiting `/` or any locale-less path redirects to the best-matching locale based on the `Accept-Language` header.
- The locale switcher in the header swaps the locale segment of the current path, so visitors keep their place in the site.
- Static UI strings (nav labels aside, which come from Elmapi) live in `src/i18n/dictionaries.ts`. Editorial content (headings, body copy, services, posts, FAQs) always comes from Elmapi entries in that locale, never from the dictionary.
- Content entries across locales are translation-linked in Elmapi so editors can jump between language versions of the same entry.

## Deploy

Deploy to any Node-compatible host (Vercel, Netlify, Docker, etc.):

1. Set the env vars above in your hosting dashboard.
2. Ensure `ELMAPI_BASE_URL` is reachable from the server.
3. `next/image` allows your Elmapi host from `ELMAPI_BASE_URL` automatically (see `next.config.ts`).
4. Set **Site URL** in Elmapi (per locale) to your production domain.

### Cache revalidation (optional webhooks)

**Without webhooks** (default): the locale layout sets `export const revalidate = 3600`, so Next.js refreshes pages from the API on the next visit after 1 hour. No extra setup required.

**With webhooks** (optional): the 1-hour ISR timer keeps running as a baseline, and Elmapi additionally notifies the site on publish/update so the affected pages refresh immediately instead of waiting for the next hour.

To enable webhooks:

1. Add the secret to your hosting environment (and `.env.local` for local testing):

   ```env
   REVALIDATE_SECRET=your-long-random-secret
   ```

2. **Redeploy** after setting `REVALIDATE_SECRET`. The API route only accepts webhook requests once this is set.

3. In Elmapi: **Project settings -> Webhooks -> Create webhook**
   - **URL:** `https://your-site.com/api/revalidate`
   - **Secret:** same as `REVALIDATE_SECRET`
   - **Events:** publish, update, unpublish, trash, delete, restore
   - **Include Payload:** on

Revalidation invalidates every locale's version of an affected path (e.g. editing `services` clears `/en/services`, `/de/services`, and `/es/services`), plus `/sitemap.xml`.

## Customizing

**In Elmapi (content authors):**

| Collection | Purpose |
|------------|---------|
| `site-settings` (singleton, per locale) | Site name, tagline, nav links, SEO defaults, contact info, social links |
| `home-page` (singleton, per locale) | Hero copy/image, CTAs, stats, intro copy/image, highlights, SEO |
| `about-page` (singleton, per locale) | Hero image, mission, values, milestones, team heading, SEO |
| `services` (per locale, translation-linked) | Capabilities: summary, description, icon, deliverables, SEO |
| `case-studies` (per locale, translation-linked) | Work stories with results, featured image, and related `services` |
| `locations` (per locale, translation-linked) | Offices with address, hours, image, and related `services` |
| `blog-categories` (per locale, translation-linked) | Blog category names and slugs |
| `authors` (single locale) | Blog author bios, shared across all locales |
| `blog-posts` (per locale, translation-linked) | Posts with category/author relations, richtext body, SEO |
| `faqs` (per locale, translation-linked) | Contact page FAQ |
| `contact-page` (singleton, per locale) | Contact heading, intro, form labels |
| `contact-submissions` | Inbound leads from the contact form (saved as drafts, tagged with the visitor's locale) |

**In the repo (developers):**

- `src/app/[locale]/` - routes and page composition, one dynamic segment covering all locales
- `src/proxy.ts` - locale detection and redirect (Next.js 16 renamed `middleware.ts` to `proxy.ts`)
- `src/i18n/` - supported locales and static UI dictionaries
- `src/components/` - UI sections
- `src/lib/content.ts` - Elmapi fetch helpers (all locale-aware)
- `src/lib/seo.ts` - metadata, canonical, hreflang alternates, OG/Twitter
- `src/app/globals.css` - theme tokens (Space Grotesk + Inter + IBM Plex Mono, cartographic light theme)

The contact form posts to Elmapi via a server action (`src/app/[locale]/contact/actions.ts`). Entries land as **drafts** in `contact-submissions` so they stay out of the public site. Your project API token needs **create** ability. Review new leads in the Elmapi admin under Contact Submissions.
