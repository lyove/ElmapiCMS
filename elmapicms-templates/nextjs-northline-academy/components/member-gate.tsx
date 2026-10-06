import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MemberGate({ teaser }: { teaser?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-8 sm:p-10">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-coral" />
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">
        Members only
      </p>
      <h2 className="mt-3 max-w-xl font-heading text-3xl font-semibold tracking-tight">
        Sign in to open the full lesson
      </h2>
      {teaser ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {teaser}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/login" className={cn(buttonVariants(), "bg-coral text-white hover:bg-coral/90")}>
          Member login
        </Link>
        <Link
          href="/register"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Create account
        </Link>
        <Link
          href="/pricing"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
