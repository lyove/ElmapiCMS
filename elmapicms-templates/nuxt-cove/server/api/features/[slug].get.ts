export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const [settings, feature] = await Promise.all([
    getSiteSettings(),
    getFeatureBySlug(slug)
  ])

  if (!feature) {
    throw createError({ statusCode: 404, statusMessage: 'Feature not found' })
  }

  return {
    settings,
    feature,
    bodyHtml: renderRichText(feature.fields.body)
  }
})
