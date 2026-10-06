import { marked } from 'marked'

marked.setOptions({
  gfm: true
})

export function renderRichText(value: unknown): string {
  if (value == null) return ''

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('<')) return trimmed
    return marked.parse(trimmed, { async: false }) as string
  }

  if (typeof value === 'object' && value !== null && 'html' in value) {
    const html = (value as { html?: unknown }).html
    if (typeof html === 'string') return html
  }

  return ''
}
