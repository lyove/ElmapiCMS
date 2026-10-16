export default defineEventHandler(async () => {
  const [settings, page, plans, faqs] = await Promise.all([
    getSiteSettings(),
    getPricingPage(),
    getPricingPlans(),
    getFaqs()
  ])

  return { settings, page, plans, faqs }
})
