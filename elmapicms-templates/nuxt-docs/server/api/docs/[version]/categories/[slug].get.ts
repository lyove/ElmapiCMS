import { NotFoundError } from '@elmapicms/js-sdk'
import {
  getCategoryBySlug,
  getDocsNav,
  getSiteSettings
} from '../../../../utils/content'
import { buildPageSeo } from '../../../../utils/seo'

export default defineEventHandler(async (event) => {
  const versionSlug = getRouterParam(event, 'version')
  const slug = getRouterParam(event, 'slug')
  if (!versionSlug || !slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing version or slug' })
  }

  try {
    const [settings, category, nav] = await Promise.all([
      getSiteSettings(),
      getCategoryBySlug(slug),
      getDocsNav(versionSlug)
    ])

    const section = nav.find(item => item.slug === slug)
    if (!section) {
      throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    }

    const seo = buildPageSeo({
      settings,
      path: `/v/${versionSlug}/category/${slug}`,
      title: category.fields.title,
      description: category.fields.description || undefined
    })

    return {
      category,
      section,
      seo
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    }
    throw error
  }
})
