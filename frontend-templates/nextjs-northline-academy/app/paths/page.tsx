import Link from "next/link";
import { LearningPathCard } from "@/components/learning-path-card";
import { getLearningPaths, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Learning paths",
    description:
      "Follow focused Northline learning paths built from a small sequence of practical courses.",
    path: "/paths",
  });
}

export default async function PathsPage() {
  const paths = await getLearningPaths();

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
            Guided sequences
          </p>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl lg:text-7xl">
            Learn in a useful order.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Each path connects a few practical courses around one meaningful
            change. Start with the next lesson, not another search.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-7 xl:grid-cols-2">
          {paths.map((path) => (
            <LearningPathCard key={path.uuid} path={path} />
          ))}
        </div>
        <p className="mt-14 border-t border-border pt-8 text-sm text-muted-foreground">
          Prefer to choose one lesson at a time?{" "}
          <Link href="/courses" className="font-bold text-ink hover:text-coral">
            Browse all courses
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
