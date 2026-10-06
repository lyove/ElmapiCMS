import { getDefaultVersion } from '../../utils/content'

export default defineEventHandler(async () => {
  try {
    const version = await getDefaultVersion()
    return { slug: version.fields.slug }
  } catch {
    return { slug: '1.0' }
  }
})
