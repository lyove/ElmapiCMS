import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type NavLink = {
  title: string;
  slug: string;
};

type PrevNextProps = {
  versionSlug: string;
  prev: NavLink | null;
  next: NavLink | null;
};

export function PrevNext({ versionSlug, prev, next }: PrevNextProps) {
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Adjacent articles"
      className="mt-16 grid gap-3 border-t border-border/80 pt-8 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={`/v/${versionSlug}/${prev.slug}`}
          className="group flex flex-col gap-1.5 rounded-xl border border-border/80 px-4 py-3.5 transition-colors hover:bg-accent/70"
        >
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            Previous
          </span>
          <span className="text-sm font-medium tracking-tight text-foreground">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/v/${versionSlug}/${next.slug}`}
          className="group flex flex-col items-end gap-1.5 rounded-xl border border-border/80 px-4 py-3.5 text-right transition-colors hover:bg-accent/70"
        >
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Next
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="text-sm font-medium tracking-tight text-foreground">
            {next.title}
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
