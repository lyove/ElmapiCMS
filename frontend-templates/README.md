# ElmapiCMS frontend templates

Production-ready frontend starters for **ElmapiCMS 4**. Each template is a standalone app: import the Elmapi project package, set env vars, install, and run.

This private repository is available to ElmapiCMS customers.

## Requirements

- Node.js 18+ (some templates may require a newer Node; see each template README)
- An ElmapiCMS 4.x instance
- A project API token (abilities noted per template)

## How to use a template

1. Open the template folder (for example `nextjs-meridian-studio/`).
2. Follow that folder’s `README.md`.
3. Import the Elmapi project file from the template’s `elmapi/` directory (or the path noted in the README).
4. Copy `.env.example` to `.env.local` or `.env` and fill in your credentials.
5. Install dependencies and start the app.

Typical env vars:

| Variable | Description |
|----------|-------------|
| `ELMAPI_BASE_URL` | Your instance API root, e.g. `https://cms.example.com/api` |
| `ELMAPI_PROJECT_ID` | Project UUID |
| `ELMAPI_API_KEY` | Project API token (server-only, never expose to the browser) |

Some templates also need auth secrets, revalidation secrets, or a public site URL. See each `.env.example`.

## Templates

### Branded sites

| Folder | Framework | What it is |
|--------|-----------|------------|
| [nextjs-meridian-studio](./nextjs-meridian-studio/) | Next.js | Creative agency / portfolio marketing site |
| [nextjs-atlas-group](./nextjs-atlas-group/) | Next.js | Multilingual company site + blog (`en` / `de` / `es`) |
| [nextjs-northline-academy](./nextjs-northline-academy/) | Next.js | Membership learning hub with end-user auth |
| [nextjs-sable-goods](./nextjs-sable-goods/) | Next.js | Design-led home goods storefront (account checkout, no Stripe) |
| [nextjs-ridgeform](./nextjs-ridgeform/) | Next.js | Modern general contractor / construction company site |
| [nuxt-cove](./nuxt-cove/) | Nuxt | SaaS product marketing site |
| [astro-marrow](./astro-marrow/) | Astro | Neighborhood bistro / restaurant site |

### Documentation

Same docs/help-center product on three frameworks. Shared Elmapi project; pick the stack you use.

| Folder | Framework |
|--------|-----------|
| [nextjs-docs](./nextjs-docs/) | Next.js |
| [nuxt-docs](./nuxt-docs/) | Nuxt |
| [astro-docs](./astro-docs/) | Astro |

### Basic starters

Reference apps for wiring Elmapi into your own projects (SDK, BFF writes, i18n, end-user auth). One shared Elmapi project for all three.

See [basic-starters/README.md](./basic-starters/README.md).

| Folder | Framework |
|--------|-----------|
| [basic-starters/nextjs](./basic-starters/nextjs/) | Next.js |
| [basic-starters/nuxt](./basic-starters/nuxt/) | Nuxt |
| [basic-starters/astro](./basic-starters/astro/) | Astro |

## Choosing a template

- **Marketing / agency:** Meridian Studio  
- **Multilingual company + blog:** Atlas Group  
- **Membership / gated content + auth:** Northline Academy  
- **Commerce / catalog + account checkout:** Sable Goods  
- **General contractor / construction:** Ridgeform  
- **SaaS marketing on Nuxt:** Cove  
- **Restaurant / menu site on Astro:** Marrow  
- **Docs / help center:** `*-docs`  
- **Learn the integration patterns:** `basic-starters`

## Local development notes

- Keep the project API token on the server only. Do not put it in `NEXT_PUBLIC_`, `NUXT_PUBLIC_`, or `PUBLIC_` variables.
- For local Herd / self-signed TLS, templates often document `NODE_TLS_REJECT_UNAUTHORIZED=0` or `NODE_OPTIONS=--use-system-ca` for development only. Never use those in production.
- After changing content in Elmapi, some templates refresh on a timer and optionally via webhooks. See each README for cache revalidation.

## Support

Template-specific setup and customization notes live in each template’s README. For ElmapiCMS product questions, use your usual support channel.
