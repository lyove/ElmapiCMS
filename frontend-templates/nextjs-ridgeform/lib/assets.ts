import type { ElmapiAsset } from "./types";

export function firstAsset(value: unknown): ElmapiAsset | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as ElmapiAsset) ?? null;
  return value as ElmapiAsset;
}

export function assetList(value: unknown): ElmapiAsset[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as ElmapiAsset[];
  return [value as ElmapiAsset];
}

export function assetAlt(asset: ElmapiAsset | null, fallback: string): string {
  return asset?.metadata?.alt_text?.trim() || fallback;
}

export function enumValue(value: string | string[] | null | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}
