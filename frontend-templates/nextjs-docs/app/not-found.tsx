import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 px-6 py-20">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        That article, category, or version is missing, unpublished, or the URL
        changed.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-docs-primary hover:underline"
      >
        Back to docs home
      </Link>
    </div>
  );
}
