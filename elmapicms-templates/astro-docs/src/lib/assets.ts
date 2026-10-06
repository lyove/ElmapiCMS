import type { ElmapiAsset } from './types';

export function firstAsset(value: ElmapiAsset | ElmapiAsset[] | null | undefined): ElmapiAsset | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

export function assetUrl(value: ElmapiAsset | ElmapiAsset[] | null | undefined): string | undefined {
  return firstAsset(value)?.url || undefined;
}
