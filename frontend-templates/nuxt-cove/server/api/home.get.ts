export default defineEventHandler(async () => {
  const [settings, home, features, testimonials, customers, plans] = await Promise.all([
    getSiteSettings(),
    getHome(),
    getFeatures(),
    getTestimonials(),
    getCustomers(),
    getPricingPlans()
  ])

  return { settings, home, features, testimonials, customers, plans }
})
