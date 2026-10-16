import type { MediaAsset } from './types'

export function firstAsset(value: MediaAsset[] | MediaAsset | null | undefined): MediaAsset | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export function assetUrl(value: MediaAsset[] | MediaAsset | null | undefined): string | null {
  return firstAsset(value)?.url ?? null
}

export function assetAlt(
  value: MediaAsset[] | MediaAsset | null | undefined,
  fallback = ''
): string {
  return firstAsset(value)?.metadata?.alt_text || fallback
}
