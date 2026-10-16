export default defineEventHandler(async () => {
  const [settings, page, entries] = await Promise.all([
    getSiteSettings(),
    getChangelogPage(),
    getChangelogEntries()
  ])

  return { settings, page, entries }
})
