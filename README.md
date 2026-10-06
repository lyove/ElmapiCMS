# ElmapiCMS 4.0

> A headless CMS built with **Laravel 13**, **React 19** and **Inertia.js 2**.

ElmapiCMS is a commercial, self-hosted headless content management system. You model content with **projects**, **collections** and **fields** in a modern React admin panel, then consume it from any frontend through a **REST API** (or one of the official starter templates). It ships with multi-locale content, an asset library, versioning, end-user authentication, outbound webhooks, AI assistance, and fine-grained role/permission management.

- **License**: Proprietary
- **Version**: 4.0.0

---

## Table of Contents

1. [Repository Layout](#repository-layout)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Requirements](#requirements)
5. [Installation (Local Development)](#installation-local-development)
6. [Getting Started](#getting-started)
7. [Headless REST API](#headless-rest-api)
8. [End-User Authentication (Project Auth)](#end-user-authentication-project-auth)
9. [AI Features](#ai-features)
10. [Webhooks](#webhooks)
11. [Frontend Templates (elmapicms-templates)](#frontend-templates-elmapicms-templates)
12. [Web Installer (elmapicms-installer)](#web-installer-elmapicms-installer)
13. [Environment Variables](#environment-variables)
14. [Testing & Code Quality](#testing--code-quality)
15. [Deployment Notes](#deployment-notes)
16. [License](#license)

---

## Repository Layout

The repository root contains several pieces. **The main application is `elmapicms/`** — everything else in this repo exists to support or distribute it.

| Path | Description |
|---|---|
| **`elmapicms/`** | The CMS application itself (Laravel backend + React/Inertia admin SPA). This is the main project. |
| `elmapicms-installer/` | A packaged distribution of the CMS with a web-based installer (`public/install.php`) for shared hosting environments. |
| `elmapicms-templates/` | Production-ready frontend starter templates (Next.js / Nuxt / Astro) that consume an ElmapiCMS project via the API. |
| `elmapicms.sql` | A database dump (reference snapshot). |
| `DOCUMENTATION.html` | Pointer to the online documentation. |
| `vendor/` | Composer dependencies (checked in at the repo root). |

### `elmapicms/` at a glance

```
elmapicms/
├── app/
│   ├── Ai/                    # AI agents & tools (Elmapi Assistant, content generation)
│   ├── Console/Commands/      # Artisan commands (ExportProjectTemplate, AuthSecurityGateCheck, …)
│   ├── Http/Controllers/      # Web (Inertia) + API (REST) controllers
│   │   └── Api/               # Public headless API controllers (OpenAPI annotated)
│   ├── Models/                # Eloquent models (Project, Collection, Field, ContentEntry, Asset, …)
│   ├── Services/              # Auth (Project Auth), Webhooks, etc.
│   └── Support/               # e.g. ContentEntryWebhookNotifier
├── bootstrap/
├── config/                    # App config incl. openapi.php, project_auth.php, webhooks.php, ai.php
├── database/
│   ├── migrations/            # Schema migrations (SQLite/MySQL)
│   └── seeders/               # Users/roles/permissions + collection/project templates
├── public/                    # Web root (index.php, favicon, logo)
├── resources/
│   ├── js/                    # React 19 + TypeScript + Tailwind 4 admin SPA (Inertia pages)
│   └── views/                 # Blade views (incl. swagger-ui)
├── routes/                    # web.php, api.php, auth.php, settings.php, console.php
├── tests/                     # Pest feature & unit tests
├── artisan
├── composer.json
└── package.json
```

---

## Key Features

**Content modeling**
- **Projects** — isolated, multi-tenant content spaces with their own locales, members, API tokens, and settings. Public API can be toggled per project.
- **Collections & Fields** — define your own content models with a drag-and-drop field editor. Supported field types:
  `text`, `longtext`, `richtext`, `slug`, `email`, `password`, `number`, `enumeration`, `boolean`, `color`, `date`, `time`, `media`, `relation`, `json`, `group` (nested fields).
- **Multi-locale** — per-project locales with a default locale, and translation-linked content entries.

**Content lifecycle**
- Draft / publish / unpublish states, soft delete (trash) with restore & force-delete.
- **Versioning** — every content entry keeps a history of versions with labels, diffable review and one-click revert (per-entry cap configurable).
- **Translations** — link entries across locales, create translations, and translate with AI.
- Bulk create / update / delete, export & import (JSON), duplicate entries, search & relation pickers.

**Assets**
- Central media library (grid/table), upload with cropping, metadata (alt, title, caption, description, author, copyright), usage tracking across entries.
- Classic upload to the local disk **or** presigned **direct upload / multipart upload** to S3-compatible storage (`ASSET_DIRECT_UPLOAD=true`).

**Access control**
- Full **user / role / permission** management (Spatie Laravel Permission) for the admin app.
- Per-project **members** and API access settings.

**Headless API**
- REST API with project isolation (`project-id` header), API tokens, per-token abilities (`read` / `create` / `update` / `delete` / `admin` / `introspect`), throttling, and OpenAPI annotations on every endpoint.

**End-user authentication (Project Auth)**
- OAuth-like auth for the frontend apps you build: auth clients & authorization codes, JWT access/refresh tokens, sessions, email verification, API keys (`uak_…`), and a full audit log.

**Webhooks**
- Outbound webhooks per project (optionally per collection) with delivery logs, retries and SSRF protection (`WEBHOOK_ALLOW_INSECURE_HTTP`).

**AI**
- **Elmapi Assistant** — an in-app AI chat that can operate on your projects (create projects/collections/fields, manage content, navigate, search).
- AI content generation inside the editor and AI translation across locales.
- Provider-agnostic: OpenAI / Anthropic / Gemini (configured in Settings → AI).

**Templates & theming**
- Save a collection or an entire project as a **template** (JSON) and reuse it; sample templates ship in the seeder.
- Branding & theme settings (app name, fonts, radius, presets), light/dark appearance.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | PHP 8.4+, **Laravel 13**, Laravel Sanctum, Spatie Laravel Permission, Intervention Image, swagger-php, Laravel AI |
| Frontend | **React 19**, TypeScript, **Inertia.js 2**, **Tailwind CSS 4**, Vite 6, Radix UI, Lexical/MDXEditor, Zod, react-hook-form, Recharts, Excalidraw |
| Database | SQLite (default) or MySQL |
| Queue / Cache / Session | Database driver by default (`.env.example`) |
| Testing | Pest PHP 4 (+ PHPUnit) |
| Code quality | Laravel Pint, ESLint 9, Prettier, `tsc --noEmit` |

---

## Requirements

- **PHP 8.4+** (with common extensions used by Laravel)
- **Composer** 2.x
- **Node.js 20+** and **npm** (Vite 6 requirement)
- A database: SQLite (zero config, default) or MySQL
- Optionally: AWS S3 / S3-compatible bucket for direct uploads, and API keys for AI features

---

## Installation (Local Development)

### 1. Install backend & frontend dependencies

```bash
cd elmapicms

composer install
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
php artisan key:generate
```

The default `.env.example` is ready for local development with SQLite — no database credentials needed.

### 3. Create the database & seed

```bash
php artisan migrate
php artisan db:seed
```

> Using SQLite, the `database/database.sqlite` file is created automatically by `migrate` (or by the composer post-install script). For MySQL, set `DB_*` variables in `.env` first.

The seeder creates:

- A default **Super Admin** user: `admin@admin.com` / `password`
- Roles: **Super Admin**, **Project Admin**, **Content Editor**
- All permissions, plus sample collection/project templates.

> ⚠️ Change the default admin password before any shared/production use.

### 4. Build or serve the frontend

Production build (one-off):

```bash
npm run build
```

Development (Vite dev server with HMR):

```bash
npm run dev
```

### 5. Start the app

```bash
php artisan serve
```

Open **http://localhost:8000** and log in with `admin@admin.com` / `password`.

### All-in-one dev command

```bash
composer run dev
```

Starts everything concurrently: `php artisan serve` + `php artisan queue:listen --tries=1` + `php artisan pail` (log tail) + `npm run dev`.

### Queue worker

The app uses the database queue by default. Some features (webhooks, AI, image processing) are queued jobs — run a worker in any environment that needs them:

```bash
php artisan queue:listen
```

---

## Getting Started

1. **Create a project** from the dashboard (name it, choose a default locale).
2. **Add locales** under *Project → Settings → Localization* (e.g. `en`, `de`, `zh-CN`).
3. **Create collections** (e.g. `posts`, `products`) and add **fields** to them (text, richtext, media, relation, …).
4. **Add content** — create entries, save drafts, publish, translate.
5. **Open the API** — under *Settings → API Access*, toggle the public API on and create an **API token**.
6. **Consume** the content from any frontend with the REST API (see below), or import one of the starter templates in `elmapicms-templates/`.

Useful extras: save the collection/project as a **template** to reuse the schema later; use the **Elmapi Assistant** chat to create projects/schemas by conversation.

---

## Headless REST API

The public API lives under `/api` and requires two things on every request:

| Header | Value |
|---|---|
| `project-id` | The project **UUID** (shown in project settings) |
| `Authorization` | `Bearer <api-token>` (created in *Settings → API Access*) |

Example:

```bash
curl "https://cms.example.com/api/posts" \
  -H "project-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <api-token>"
```

**Main resource groups** (all controllers are OpenAPI-annotated):

| Group | Endpoints (examples) |
|---|---|
| Project | `GET /api` — project info |
| Project config | `POST /api/project/locales`, `PUT /api/project/locales/default`, `DELETE /api/project/locales/{locale}` |
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`, API-key management |
| Collections | `GET /api/collections`, `GET /api/collections/{collection}` (admin: create/update/delete/reorder, field CRUD) |
| Content | `GET/POST /api/{collection}`, `GET/PUT/PATCH/DELETE /api/{collection}/{uuid}`, publish/unpublish/discard-draft, link-translation, versions (`/versions`), bulk endpoints |
| Assets | `GET /api/files`, `POST /api/files`, `POST /api/files/bulk/upload`, direct/multipart upload, `GET/DELETE /api/files/{identifier}` |
| Webhooks | `GET/POST /api/webhooks`, logs |

**Abilities**: tokens carry abilities enforced by the `project.ability` middleware — `read`, `create`, `update`, `delete`, `admin`, and `introspect` (for API-key introspection).

**Rate limiting**: the API group is throttled (`API_RATE_LIMIT_PER_MINUTE`, default 300), with separate throttles for auth endpoints.

---

## End-User Authentication (Project Auth)

Under *Project → Settings → Auth*, you can enable authentication for the **end users of the frontend apps** you build (not the CMS admins):

- Auth clients & authorization codes (OAuth-like flow)
- JWT access tokens + refresh tokens (TTLs configurable)
- User sessions (list & revoke), email verification, suspended users
- API keys (`uak_…`) for server-to-server calls
- **Audit log** of authentication events

Relevant env vars: `PROJECT_AUTH_ISSUER`, `PROJECT_AUTH_ACCESS_TOKEN_TTL_MINUTES`, `PROJECT_AUTH_REFRESH_TOKEN_TTL_DAYS`, `PROJECT_AUTH_ENABLE_PASSWORD_GRANT`.

---

## AI Features

1. **Settings → AI** — configure provider API keys (OpenAI, Anthropic, Gemini).
2. **Elmapi Assistant** — an in-app AI chat that works on your data using tools: `CreateProject`, `CreateSchema`, `ManageContent`, `ManageProject`, `ManageSchema`, `NavigateTo`, `SearchProjects`.
3. **Content generation** — generate/rewrite content inside the editor.
4. **AI translation** — translate an entry to another locale with AI.

---

## Webhooks

Outbound webhooks notify your services about content changes. Configure them under *Project → Settings → Webhooks*:

- Target URL, secret, and which events to send (optionally scoped to collections)
- Per-webhook delivery **logs** (request/response bodies, status) with pagination
- Retries handled through the queue
- SSRF protection: HTTPS-only by default; `WEBHOOK_ALLOW_INSECURE_HTTP=true` disables that (development only)

---

## Frontend Templates (elmapicms-templates)

The `elmapicms-templates/` folder holds production-ready starters that consume an Elmapi project:

- **Next.js**: `nextjs-meridian-studio` (agency), `nextjs-atlas-group` (multilingual site + blog), `nextjs-northline-academy` (membership learning hub), `nextjs-sable-goods` (storefront), `nextjs-ridgeform` (contractor), `nextjs-docs` (docs)
- **Nuxt**: `nuxt-cove` (SaaS marketing), `nuxt-docs`
- **Astro**: `astro-marrow` (restaurant), `astro-docs`
- **basic-starters/** — minimal Next.js / Nuxt / Astro references showing API wiring, BFF writes, i18n and end-user auth

Each template is a standalone app — see its own `README.md` and `.env.example` (typical vars: `ELMAPI_BASE_URL`, `ELMAPI_PROJECT_ID`, `ELMAPI_API_KEY`).

---

## Web Installer (elmapicms-installer)

For shared hosting without CLI access, use the `elmapicms-installer/` package:

1. Upload the contents of `elmapicms-installer/` to your web root.
2. Open `install.php` in the browser.
3. The installer checks server requirements, writes `.env` (via `EnvWriter`), fixes paths (`PathFixer`/`PathResolver`), runs the migration, and cleans up after itself (`Cleanup`).

It is a packaged distribution of the same `elmapicms` application with a pre-built frontend (`public/build`).

---

## Environment Variables

Key variables from `.env.example`:

| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME` | `ElmapiCMS 4.0` | Application name |
| `APP_URL` | `http://localhost` | Public base URL |
| `APP_VERSION` | `4.0.0` | Version shown in the app |
| `DB_CONNECTION` | `sqlite` | `sqlite` or `mysql` |
| `MAX_FILE_SIZE` | `2M` | Upload size limit for classic uploads |
| `ASSET_DIRECT_UPLOAD` | `false` | Enable presigned direct/multipart uploads (requires S3 disk + bucket CORS) |
| `AWS_*` | — | S3 credentials for the `s3` disk |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | — | AI provider keys (Settings → AI) |
| `WEBHOOK_ALLOW_INSECURE_HTTP` | `false` | Allow non-HTTPS webhook targets (dev only) |
| `WEBHOOK_LOG_RESPONSE_BODY_MAX_BYTES` | `8192` | Webhook log body limits |
| `CONTENT_VERSIONS_PER_ENTRY` | `-1` | Version history cap per entry (`-1` = unlimited) |
| `API_RATE_LIMIT_PER_MINUTE` | `300` | Main `/api` rate limit |
| `PROJECT_AUTH_*` | — | End-user auth settings (TTLs, issuer, password grant) |
| `SESSION_DRIVER` / `CACHE_STORE` / `QUEUE_CONNECTION` | `database` | Drivers (SQLite-friendly defaults) |

---

## Testing & Code Quality

Run the test suite (Pest):

```bash
composer test          # or: php artisan test --compact
```

Run only a subset:

```bash
php artisan test --compact --filter=ProjectCreationTest
```

Code quality tooling:

```bash
vendor/bin/pint --dirty     # format changed PHP files
npm run lint                # ESLint (fix)
npm run format              # Prettier (resources/)
npm run types               # tsc --noEmit
```

---

## Deployment Notes

- Standard Laravel deployment applies: `composer install --no-dev --optimize-autoloader`, `npm run build`, `php artisan migrate --force`, `php artisan config:cache` / `route:cache`, and a queue worker for webhooks/AI/image processing.
- Serve the site from `elmapicms/public/` (or the installer package on shared hosting).
- Use MySQL for production databases; set `APP_ENV=production`, `APP_DEBUG=false`.
- Keep API tokens server-side only; never expose them in browser bundles (see templates README).
