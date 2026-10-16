import { transformerCopyButton } from '@rehype-pretty/transformers'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import {
  cmsOriginFromApiBase,
  rehypeAbsolutizeCmsMedia,
  rewriteCmsMediaUrlsInHtml
} from './cms-media'
import type { TocItem } from './types'

function elmapiBaseUrl(): string {
  const config = useRuntimeConfig()
  const env = typeof process !== 'undefined' ? process.env : undefined
  return String(
    env?.['ELMAPI_BASE_URL']
    || env?.['NUXT_ELMAPI_BASE_URL']
    || config.elmapiBaseUrl
    || ''
  ).trim()
}

/** Prefer markdown source; if API still returns HTML, leave it for the renderer fallback. */
export function normalizeMarkdown(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  // Drop a leading H1 so the page title owns the heading.
  return trimmed.replace(/^#\s+.+\n+/, '')
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~[\]]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

/** Extract h2/h3 headings from markdown for the TOC. */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = []
  const seen = new Map<string, number>()

  for (const line of markdown.split('\n')) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim())
    if (!match) continue
    const depth = match[1].length
    const title = match[2].replace(/#+\s*$/, '').trim()
    if (!title) continue

    let id = slugify(title)
    const count = seen.get(id) ?? 0
    seen.set(id, count + 1)
    if (count > 0) id = `${id}-${count}`

    items.push({ id, title, depth })
  }

  return items
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const origin = cmsOriginFromApiBase(elmapiBaseUrl())

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithubBlockquoteAlert)
    // MDXEditor stores resized images as raw HTML <img> — keep them.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeAbsolutizeCmsMedia(origin))
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      theme: {
        light: 'vitesse-light',
        dark: 'vitesse-dark'
      },
      keepBackground: false,
      defaultLang: 'text',
      transformers: [
        transformerCopyButton({
          visibility: 'hover',
          feedbackDuration: 2_500
        })
      ]
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)

  return String(file)
}

export async function renderArticleBody(value: string | null | undefined): Promise<string> {
  const markdown = normalizeMarkdown(value)
  if (!markdown) return ''

  const origin = cmsOriginFromApiBase(elmapiBaseUrl())

  if (markdown.startsWith('<') && /<\/[a-z]/i.test(markdown)) {
    const html = markdown.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '')
    return origin ? rewriteCmsMediaUrlsInHtml(html, origin) : html
  }

  return renderMarkdown(markdown)
}
