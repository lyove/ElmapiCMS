function urlEntry(loc: string, lastmod?: string | null) {
  const last = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''
  return `  <url>\n    <loc>${loc}</loc>${last}\n  </url>`
}

export default defineEventHandler(async (event) => {
  const settings = await getSiteSettings()
  const base = resolveSiteUrl(settings)

  const [features, posts, changelog] = await Promise.all([
    getFeatures(),
    getBlogPosts(),
    getChangelogEntries()
  ])

  const staticPaths = [
    '',
    '/features',
    '/pricing',
    '/about',
    '/blog',
    '/changelog',
    '/contact'
  ]

  const urls = [
    ...staticPaths.map(path => urlEntry(`${base}${path}`)),
    ...features.map(f => urlEntry(`${base}/features/${f.fields.slug}`, f.published_at)),
    ...posts.map(p => urlEntry(`${base}/blog/${p.fields.slug}`, p.published_at)),
    ...changelog.map(c => urlEntry(`${base}/changelog/${c.fields.slug}`, c.published_at))
  ]

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
})
