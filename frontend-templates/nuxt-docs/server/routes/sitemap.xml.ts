function urlEntry(loc: string, lastmod?: string | null) {
  const last = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''
  return `  <url>\n    <loc>${loc}</loc>${last}\n  </url>`
}

export default defineEventHandler(async (event) => {
  let base = useRuntimeConfig().public.siteUrl || 'http://localhost:3000'

  try {
    const settings = await getSiteSettings()
    base = resolveSiteUrl(settings)
  } catch {
    // keep fallback
  }

  const origin = base.replace(/\/$/, '')
  const urls: string[] = [urlEntry(origin)]

  try {
    const [versions, categories, articles] = await Promise.all([
      getVersions(),
      getCategories(),
      getArticles()
    ])

    for (const version of versions) {
      if (!version.fields.slug) continue
      urls.push(urlEntry(`${origin}/v/${version.fields.slug}`))

      for (const category of categories) {
        if (!category.fields.slug) continue
        urls.push(
          urlEntry(`${origin}/v/${version.fields.slug}/category/${category.fields.slug}`)
        )
      }
    }

    for (const article of articles) {
      const versionSlug = article.fields.version?.fields.slug
      const slug = article.fields.slug
      if (!versionSlug || !slug) continue
      urls.push(
        urlEntry(`${origin}/v/${versionSlug}/${slug}`, article.published_at)
      )
    }
  } catch {
    // Return home-only sitemap if CMS is unavailable.
  }

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
})
