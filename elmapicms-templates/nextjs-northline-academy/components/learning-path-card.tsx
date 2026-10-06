import Image from "next/image";
import Link from "next/link";
import { assetAlt, firstAsset } from "@/lib/assets";
import type { ContentEntry, LearningPathFields } from "@/lib/types";

export function LearningPathCard({
  path,
}: {
  path: ContentEntry<LearningPathFields>;
}) {
  const cover = firstAsset(path.fields.cover);
  const slug = path.fields.slug;
  const courseCount = path.fields.courses?.length ?? 0;

  return (
    <Link
      href={slug ? `/paths/${slug}` : "/paths"}
      className="group grid overflow-hidden rounded-2xl bg-ink text-white transition-transform duration-300 hover:-translate-y-1 lg:grid-cols-[1.05fr_0.95fr]"
    >
      <div className="relative order-first aspect-[16/10] overflow-hidden bg-white/10 lg:order-last lg:aspect-auto lg:min-h-64">
        {cover?.url ? (
          <Image
            src={cover.url}
            alt={assetAlt(cover, path.fields.title || "Learning path")}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
        ) : null}
      </div>
      <div className="flex flex-col p-6 sm:p-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-coral">
          {path.fields["member-only"] ? "Member path" : "Open path"}
        </p>
        <h3 className="mt-4 font-heading text-2xl font-semibold leading-tight sm:text-3xl">
          {path.fields.title}
        </h3>
        {path.fields.summary ? (
          <p className="mt-4 text-sm leading-6 text-white/65">
            {path.fields.summary}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-4 pt-6 text-xs font-semibold text-white/55 sm:pt-8">
          {path.fields["duration-label"] ? (
            <span>{path.fields["duration-label"]}</span>
          ) : null}
          <span>{courseCount} courses</span>
          {path.fields.level ? <span>{path.fields.level}</span> : null}
        </div>
      </div>
    </Link>
  );
}
