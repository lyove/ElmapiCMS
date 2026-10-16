export default defineEventHandler(async () => {
  const [settings, page, posts] = await Promise.all([
    getSiteSettings(),
    getBlogPage(),
    getBlogPosts()
  ])

  return { settings, page, posts }
})
