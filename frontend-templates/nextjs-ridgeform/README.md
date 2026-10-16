# Ridgeform (Next.js)

A company website starter for a modern general contractor. Built with Next.js App Router, Tailwind, shadcn/ui, and ElmapiCMS. Demo content covers services, projects, process, team, testimonials, FAQs, and contact inquiries.

## Requirements

- Node.js 18+
- An ElmapiCMS project (v4+) with an API token that can read published content and create `contact-submissions` and `newsletter-subscribers` drafts
- npm

## Import the Elmapi project

1. In ElmapiCMS, click "+ New Project".
2. Name your project and add a description if you want.
3. Choose "Import from file".
4. Choose the `elmapi/project-nextjs-ridgeform.zip` file.
5. Click "Create Project".

Demo content includes site settings, home/about/process/contact pages, services, projects, team, testimonials, FAQs, contact submissions, and newsletter subscribers. Create a project API token with `read` and `create`.

## Configure environment

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
|---|---|
| `ELMAPI_BASE_URL` | API root, e.g. `https://your-instance.example/api` |
| `ELMAPI_PROJECT_ID` | Project UUID |
| `ELMAPI_API_KEY` | Server-only project API token |
| `NEXT_PUBLIC_SITE_URL` | Public site origin for canonical URLs and sitemap |
| `REVALIDATE_SECRET` | Optional. Enables `POST /api/revalidate` webhooks |
| `REVALIDATION_COLLECTION_IDS` | Optional JSON map of collection id → slug |

Keep `ELMAPI_API_KEY` server-only. Do not prefix it with `NEXT_PUBLIC_`.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

- Set the same env vars in your host.
- `next/image` allows your Elmapi host from `ELMAPI_BASE_URL` automatically (see `next.config.ts`).
- Set Site URL in Elmapi `site-settings` to the production origin.
- Optional: point an Elmapi webhook at `/api/revalidate` with `REVALIDATE_SECRET` (header `x-revalidate-secret` or HMAC `x-webhook-signature`). Pages also revalidate on a 1-hour ISR window.

On Netlify, `netlify.toml` omits `.next/cache` from secrets scanning. Turbopack can store env values in that cache during build; those files are not published.

## Customizing

| Content | Where |
|---|---|
| Company name, phone, email, nav, utility bar, SEO defaults | Elmapi `site-settings` |
| Home hero, featured services/projects, stats, CTA | Elmapi `home-page` |
| Services and projects | Elmapi `services`, `projects` |
| About, process, contact copy | Elmapi `about-page`, `process-page`, `contact-page` |
| Team, testimonials, FAQs | Elmapi `team-members`, `testimonials`, `faqs` |
| Contact form submissions | Elmapi `contact-submissions` (drafts via BFF) |
| Newsletter signups | Elmapi `newsletter-subscribers` (drafts via BFF) |
| Visual theme, layout, components | This repo (`app/`, `components/`, `app/globals.css`) |

## Cache revalidation

- Baseline: `export const revalidate = 3600` on the root layout
- On-demand: `POST /api/revalidate` when `REVALIDATE_SECRET` is set
