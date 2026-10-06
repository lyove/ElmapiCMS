"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { ContentEntry, DocVersionFields } from "@/lib/types";

type VersionSwitcherProps = {
  versions: ContentEntry<DocVersionFields>[];
  currentSlug: string;
};

export function VersionSwitcher({
  versions,
  currentSlug,
}: VersionSwitcherProps) {
  const router = useRouter();

  function onChange(nextSlug: string) {
    if (!nextSlug || nextSlug === currentSlug) return;
    router.push(`/v/${encodeURIComponent(nextSlug)}`);
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Documentation version</span>
      <select
        value={currentSlug}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 appearance-none rounded-md border border-border bg-background pr-8 pl-2.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-docs-primary/30"
      >
        {versions.map((version) => {
          const slug = version.fields.slug || version.uuid;
          const label = version.fields.label || slug;
          return (
            <option key={version.uuid} value={slug}>
              {label}
            </option>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}
