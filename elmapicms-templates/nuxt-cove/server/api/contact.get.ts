export default defineEventHandler(async () => {
  const [settings, page, faqs] = await Promise.all([
    getSiteSettings(),
    getContactPage(),
    getFaqs()
  ])

  return { settings, page, faqs }
})
