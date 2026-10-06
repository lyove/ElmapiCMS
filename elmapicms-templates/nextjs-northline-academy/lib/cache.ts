/**
 * Page cache lifetime for ISR, in seconds.
 *
 * Next.js statically parses `export const revalidate`; it only accepts a
 * literal. The live export lives on `app/layout.tsx` as
 * `export const revalidate = 3600`. This constant documents that shared value.
 *
 * This 1-hour baseline runs regardless of `REVALIDATE_SECRET`. When the secret
 * is configured, `POST /api/revalidate` additionally calls `revalidatePath`
 * when Elmapi webhooks fire.
 */
export const pageRevalidate = 3600;
