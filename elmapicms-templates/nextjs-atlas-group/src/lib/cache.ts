/**
 * Page cache lifetime for ISR, in seconds.
 *
 * Next.js statically parses `export const revalidate`; it only accepts a
 * literal, not an imported identifier or expression. The live export lives
 * once on the locale layout (`src/app/[locale]/layout.tsx`) as
 * `export const revalidate = 3600`. This constant documents that shared value.
 *
 * This 1-hour baseline runs regardless of `REVALIDATE_SECRET`. When the secret
 * is configured, `POST /api/revalidate` additionally calls `revalidatePath`
 * on the affected routes as soon as Elmapi's webhook fires, so content
 * updates show up immediately instead of waiting for the next hour.
 */
export const pageRevalidate = 3600;
