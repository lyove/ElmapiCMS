import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] flex-col justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.85_0.18_130_/_0.1),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--background)_90%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="font-heading mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
          This page left the studio
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          The link may be outdated, or the page was never published. Head back home or browse the
          work.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8")}>
            Back home
          </Link>
          <Link
            href="/work"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full px-8")}
          >
            View work
          </Link>
          <Link
            href="/contact"
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "rounded-full px-8")}
          >
            Contact
          </Link>
        </div>
      </div>
    </section>
  );
}
