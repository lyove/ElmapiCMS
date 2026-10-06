import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: false })

function looksLikeHtml(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.startsWith('<') && /<\/[a-z][a-z0-9]*>/i.test(trimmed)
}

export function richTextToHtml(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (looksLikeHtml(trimmed)) return trimmed
  return marked.parse(trimmed, { async: false }) as string
}
