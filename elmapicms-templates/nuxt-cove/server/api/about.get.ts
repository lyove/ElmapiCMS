export default defineEventHandler(async () => {
  const [settings, page, testimonials, customers] = await Promise.all([
    getSiteSettings(),
    getAboutPage(),
    getTestimonials(),
    getCustomers()
  ])

  return {
    settings,
    page,
    testimonials,
    customers,
    bodyHtml: renderRichText(page.fields.body)
  }
})
