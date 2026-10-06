import Image from "next/image";
import Link from "next/link";
import { assetAlt, firstAsset } from "@/lib/assets";
import type { ContentEntry, CourseFields } from "@/lib/types";

export function CourseCard({
  course,
  href,
}: {
  course: ContentEntry<CourseFields>;
  href?: string;
}) {
  const cover = firstAsset(course.fields.cover);
  const slug = course.fields.slug;
  const to = href || (slug ? `/courses/${slug}` : "/courses");
  const memberOnly = Boolean(course.fields["member-only"]);
  const category = course.fields.category?.fields?.name;

  return (
    <Link
      href={to}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white transition duration-300 hover:-translate-y-1 hover:border-coral/40 hover:shadow-[0_18px_50px_rgba(11,31,58,0.12)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {cover?.url ? (
          <Image
            src={cover.url}
            alt={assetAlt(cover, course.fields.title || "Course cover")}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.045]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : null}
        {memberOnly ? (
          <span className="absolute left-4 top-4 rounded-md bg-ink px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            Members
          </span>
        ) : (
          <span className="absolute left-4 top-4 rounded-md bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink shadow-sm">
            Open
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {category ? <span className="text-coral">{category}</span> : null}
          {course.fields.level ? <span>· {course.fields.level}</span> : null}
          {course.fields["duration-label"] ? (
            <span>· {course.fields["duration-label"]}</span>
          ) : null}
        </div>
        <h3 className="font-heading text-[1.45rem] font-semibold leading-tight tracking-tight transition-colors group-hover:text-coral">
          {course.fields.title}
        </h3>
        {course.fields.summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {course.fields.summary}
          </p>
        ) : null}
        <span className="mt-auto pt-3 text-sm font-bold text-ink">
          Preview course <span aria-hidden className="ml-1 text-coral">→</span>
        </span>
      </div>
    </Link>
  );
}
