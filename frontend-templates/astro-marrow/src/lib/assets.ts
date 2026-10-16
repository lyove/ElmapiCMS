import type { ElmapiAsset } from './types';

export function firstAsset(value: unknown): ElmapiAsset | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as ElmapiAsset) ?? null;
  return value as ElmapiAsset;
}

export function getMediaUrl(value: unknown): string | null {
  return firstAsset(value)?.url ?? null;
}

export function getMediaAlt(value: unknown, fallback = ''): string {
  const asset = firstAsset(value);
  return asset?.metadata?.alt_text?.trim() || fallback;
}
