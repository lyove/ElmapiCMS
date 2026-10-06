import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@elmapicms/js-sdk";
import { auth } from "@/auth";
import { MemberGate } from "@/components/member-gate";
import { RichText } from "@/components/rich-text";
import { assetAlt, firstAsset } from "@/lib/assets";
import { getCourseBySlug, getCourseSlugs, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  try {
    const slugs = await getCourseSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const [settings, course] = await Promise.all([
      getSiteSettings(),
      getCourseBySlug(slug),
    ]);
    const cover = firstAsset(course.fields.cover);
    return buildMetadata({
      settings,
      title: course.fields["meta-title"] || course.fields.title,
      description:
        course.fields["meta-description"] || course.fields.summary,
      path: `/courses/${slug}`,
      imageUrl: cover?.url,
    });
  } catch {
    return {};
  }
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let course;
  try {
    course = await getCourseBySlug(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const session = await auth();
  const signedIn = Boolean(session?.accessToken) && !session?.authError;
  const memberOnly = Boolean(course.fields["member-only"]);
  const canReadBody = !memberOnly || signedIn;
  const cover = firstAsset(course.fields.cover);
  const category = course.fields.category?.fields?.name;
  const instructor = course.fields.instructor?.fields;

  return (
    <article className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <div className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {memberOnly ? <span className="text-coral">Members</span> : <span className="text-coral">Open</span>}
          {category ? <span>· {category}</span> : null}
          {course.fields.level ? <span>· {course.fields.level}</span> : null}
          {course.fields["duration-label"] ? (
            <span>· {course.fields["duration-label"]}</span>
          ) : null}
          {course.fields["lesson-count"] ? (
            <span>· {course.fields["lesson-count"]} lessons</span>
          ) : null}
        </div>
        <h1 className="mt-5 font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          {course.fields.title}
        </h1>
        {course.fields.summary ? (
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            {course.fields.summary}
          </p>
        ) : null}
        {instructor?.slug ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Taught by{" "}
            <Link
              href={`/instructors/${instructor.slug}`}
              className="font-bold text-ink hover:text-coral"
            >
              {instructor.name}
            </Link>
            {instructor.role ? `, ${instructor.role}` : null}
          </p>
        ) : null}
      </div>

      {cover?.url ? (
        <div className="relative mt-12 aspect-[16/8] overflow-hidden rounded-[2rem]">
          <Image
            src={cover.url}
            alt={assetAlt(cover, course.fields.title || "Course cover")}
            fill
            className="object-cover"
            sizes="(max-width: 900px) 100vw, 900px"
            priority
          />
        </div>
      ) : null}

      <div className="mx-auto mt-14 max-w-3xl">
        {course.fields.outcomes?.length ? (
          <section className="mb-14 rounded-2xl bg-surface p-7 sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">
              What you will be able to do
            </p>
            <ul className="mt-6 grid gap-4">
              {course.fields.outcomes.map((outcome) =>
                outcome.label ? (
                  <li
                    key={outcome.label}
                    className="flex gap-4 text-sm leading-6 text-ink"
                  >
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-coral" />
                    {outcome.label}
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}
        {canReadBody ? (
          <RichText value={course.fields.body} />
        ) : (
          <MemberGate teaser={course.fields.teaser || course.fields.summary} />
        )}
      </div>
    </article>
  );
}
