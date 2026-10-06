import Image from "next/image";
import Link from "next/link";
import { assetAlt, firstAsset } from "@/lib/assets";
import type { ContentEntry, TeamMemberFields } from "@/lib/types";

type TeamGridProps = {
  members: ContentEntry<TeamMemberFields>[];
};

export function TeamGrid({ members }: TeamGridProps) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => {
        const photo = firstAsset(member.fields.photo);
        return (
          <article key={member.uuid} className="group">
            <div className="relative mb-5 aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
              {photo ? (
                <Image
                  src={photo.url}
                  alt={assetAlt(photo, member.fields.name || "Team member")}
                  fill
                  className="object-cover grayscale transition duration-500 group-hover:grayscale-0"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-card" />
              )}
            </div>
            <h3 className="font-heading text-xl font-semibold">{member.fields.name}</h3>
            <p className="mt-1 text-sm text-primary">{member.fields.role}</p>
            {member.fields.bio ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {member.fields.bio}
              </p>
            ) : null}
            <div className="mt-4 flex gap-4 text-xs uppercase tracking-widest">
              {member.fields["linkedin-url"] ? (
                <a
                  href={member.fields["linkedin-url"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  LinkedIn
                </a>
              ) : null}
              {member.fields["twitter-url"] ? (
                <a
                  href={member.fields["twitter-url"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Twitter
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

type InsightCardProps = {
  title?: string;
  slug?: string;
  excerpt?: string;
  category?: string;
  authorName?: string;
  publishedAt?: string | null;
  imageUrl?: string | null;
};

export function InsightCard({
  title,
  slug,
  excerpt,
  category,
  authorName,
  publishedAt,
  imageUrl,
}: InsightCardProps) {
  if (!slug) return null;
  const date = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/insights/${slug}`}
      className="group block overflow-hidden rounded-2xl border border-border/50 bg-card/30 transition hover:border-primary/25"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title || "Insight"}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : null}
      </div>
      <div className="space-y-2 p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          {category ? <span className="text-primary">{category}</span> : null}
          {category && (date || authorName) ? <span aria-hidden>·</span> : null}
          {[date, authorName].filter(Boolean).join(" · ")}
        </div>
        <h3 className="font-heading text-xl font-semibold group-hover:text-primary">{title}</h3>
        {excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}
