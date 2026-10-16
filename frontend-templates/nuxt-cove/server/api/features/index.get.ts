export default defineEventHandler(async () => {
  const [settings, page, features, testimonials] = await Promise.all([
    getSiteSettings(),
    getFeaturesPage(),
    getFeatures(),
    getTestimonials()
  ])

  return { settings, page, features, testimonials }
})
