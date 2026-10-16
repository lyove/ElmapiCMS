export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const [settings, post] = await Promise.all([
    getSiteSettings(),
    getBlogPostBySlug(slug)
  ])

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  return {
    settings,
    post,
    bodyHtml: renderRichText(post.fields.body)
  }
})
