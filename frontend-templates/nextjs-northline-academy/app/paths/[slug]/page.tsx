import Image from "next/image";
import Link from "next/link";
import { NotFoundError } from "@elmapicms/js-sdk";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CourseCard } from "@/components/course-card";
import { MemberGate } from "@/components/member-gate";
import { RichText } from "@/components/rich-text";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getLearningPathBySlug,
  getLearningPathSlugs,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    return (await getLearningPathSlugs()).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const [settings, path] = await Promise.all([
      getSiteSettings(),
      getLearningPathBySlug(slug),
    ]);
    const cover = firstAsset(path.fields.cover);
    return buildMetadata({
      settings,
      title: path.fields["meta-title"] || path.fields.title,
      description: path.fields["meta-description"] || path.fields.summary,
      path: `/paths/${slug}`,
      imageUrl: cover?.url,
    });
  } catch {
    return {};
  }
}

export default async function PathDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let path;
  try {
    path = await getLearningPathBySlug(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const session = await auth();
  const signedIn = Boolean(session?.accessToken) && !session?.authError;
  const memberOnly = Boolean(path.fields["member-only"]);
  const canOpen = !memberOnly || signedIn;
  const cover = firstAsset(path.fields.cover);
  const instructor = path.fields["lead-instructor"]?.fields;

  return (
    <article>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
              {memberOnly ? "Member learning path" : "Open learning path"}
            </p>
            <h1 className="mt-5 font-heading text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-6xl">
              {path.fields.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              {path.fields.summary}
            </p>
            <div className="mt-7 flex flex-wrap gap-5 text-xs font-bold uppercase tracking-[0.1em] text-ink/55">
              <span>{path.fields["duration-label"]}</span>
              <span>{path.fields.courses?.length ?? 0} courses</span>
              <span>{path.fields.level}</span>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-white">
            {cover?.url ? (
              <Image
                src={cover.url}
                alt={assetAlt(cover, path.fields.title || "Learning path")}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 52vw"
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        {canOpen ? (
          <div className="grid gap-14 lg:grid-cols-[0.65fr_1.35fr]">
            <aside>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">
                Led by
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold text-ink">
                {instructor?.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {instructor?.role}
              </p>
              {instructor?.slug ? (
                <Link
                  href={`/instructors/${instructor.slug}`}
                  className="mt-5 inline-block text-sm font-bold text-ink hover:text-coral"
                >
                  Meet the instructor <span aria-hidden>→</span>
                </Link>
              ) : null}
            </aside>
            <div>
              <RichText value={path.fields.introduction} />
              <h2 className="mt-16 font-heading text-4xl font-semibold text-ink">
                Your course sequence
              </h2>
              <div className="mt-8 grid gap-7 md:grid-cols-2">
                {(path.fields.courses ?? []).map((course) => (
                  <CourseCard key={course.uuid} course={course} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <MemberGate teaser={path.fields.summary} />
          </div>
        )}
      </section>
    </article>
  );
}
