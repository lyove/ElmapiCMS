# Elmapi basic starters

Reference / copyable starters for wiring **ElmapiCMS** into every project.

## Shared project

All starters in this folder use **one** Elmapi project (locales `en` + `de`, collections `site-settings` and `notes`).

Import file: [`elmapi-project-basic-starters.json`](./elmapi-project-basic-starters.json) (schema + demo notes for both locales). In ElmapiCMS: **+ New Project** → **Import from file** → choose that JSON → create a project API token with read + write abilities.

| [nextjs/](./nextjs/) 
| [nuxt/](./nuxt/) 
| [astro/](./astro/) 

All three reuse the same project and the same feature set.

## What each starter demonstrates

- Server-only project API token
- List / get content by locale
- Filtering and pagination examples
- BFF writes (create note, asset upload); if signed in, create note attaches author fields via `me()`
- Locale-prefixed routes + switcher
- Project user auth that passes the Elmapi auth contract (login, refresh, logout with backend revoke)
