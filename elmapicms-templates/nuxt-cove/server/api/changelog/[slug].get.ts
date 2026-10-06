export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const [settings, entry] = await Promise.all([
    getSiteSettings(),
    getChangelogBySlug(slug)
  ])

  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Changelog entry not found' })
  }

  return {
    settings,
    entry,
    bodyHtml: renderRichText(entry.fields.body)
  }
})
