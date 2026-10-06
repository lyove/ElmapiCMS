import { NotFoundError } from '@elmapicms/js-sdk'
import {
  getArticleBySlug,
  getDocsNav,
  getPrevNext,
  getSiteSettings
} from '../../../../utils/content'
import { extractToc, normalizeMarkdown, renderArticleBody } from '../../../../utils/markdown'
import { buildPageSeo } from '../../../../utils/seo'

export default defineEventHandler(async (event) => {
  const versionSlug = getRouterParam(event, 'version')
  const slug = getRouterParam(event, 'slug')
  if (!versionSlug || !slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing version or slug' })
  }

  if (slug === 'category') {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  try {
    const [settings, article, nav] = await Promise.all([
      getSiteSettings(),
      getArticleBySlug(versionSlug, slug),
      getDocsNav(versionSlug)
    ])

    const body = normalizeMarkdown(article.fields.body)
    const [html, toc] = await Promise.all([
      renderArticleBody(article.fields.body),
      Promise.resolve(extractToc(body))
    ])
    const { prev, next } = getPrevNext(nav, slug)
    const category = article.fields.category

    const seo = buildPageSeo({
      settings,
      path: `/v/${versionSlug}/${slug}`,
      title: article.fields['seo-title'] || article.fields.title,
      description:
        article.fields['seo-description']
        || article.fields.summary
        || undefined
    })

    return {
      article,
      html,
      toc,
      prev,
      next,
      category,
      seo
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Article not found' })
    }
    throw error
  }
})
