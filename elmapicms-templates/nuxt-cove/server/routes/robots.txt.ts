export default defineEventHandler(async (event) => {
  const settings = await getSiteSettings().catch(() => null)
  const base = resolveSiteUrl(settings)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`
})
