import { notFound } from "next/navigation";

/** Catches any unmatched path inside a locale (e.g. /en/nonexistent) and renders the localized not-found.tsx. */
export default function CatchAllPage(): never {
  notFound();
}
