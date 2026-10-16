import Image from "next/image";
import Link from "next/link";
import { assetAlt, firstAsset } from "@/lib/assets";
import type { ContentEntry, InstructorFields } from "@/lib/types";

export function InstructorCard({
  instructor,
}: {
  instructor: ContentEntry<InstructorFields>;
}) {
  const portrait = firstAsset(instructor.fields.portrait);
  const expertise = instructor.fields.expertise?.slice(0, 3) ?? [];

  return (
    <Link
      href={`/instructors/${instructor.fields.slug}`}
      className="group block border-t border-border pt-4"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
        {portrait?.url ? (
          <Image
            src={portrait.url}
            alt={assetAlt(portrait, instructor.fields.name || "Instructor")}
            fill
            className="object-cover grayscale-[15%] transition duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : null}
      </div>
      <h3 className="mt-5 font-heading text-2xl font-semibold text-ink">
        {instructor.fields.name}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {instructor.fields.role}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {expertise.map((item) =>
          item.label ? (
            <span
              key={item.label}
              className="rounded-full bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/65"
            >
              {item.label}
            </span>
          ) : null,
        )}
      </div>
    </Link>
  );
}
