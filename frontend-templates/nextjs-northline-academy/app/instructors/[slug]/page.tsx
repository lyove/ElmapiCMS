import Image from "next/image";
import { NotFoundError } from "@elmapicms/js-sdk";
import { notFound } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { RichText } from "@/components/rich-text";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getCoursesByInstructor,
  getInstructorBySlug,
  getInstructorSlugs,
  getSiteSettings,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    return (await getInstructorSlugs()).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const [settings, instructor] = await Promise.all([
      getSiteSettings(),
      getInstructorBySlug(slug),
    ]);
    const portrait = firstAsset(instructor.fields.portrait);
    return buildMetadata({
      settings,
      title: instructor.fields["meta-title"] || instructor.fields.name,
      description:
        instructor.fields["meta-description"] || instructor.fields["short-bio"],
      path: `/instructors/${slug}`,
      imageUrl: portrait?.url,
    });
  } catch {
    return {};
  }
}

export default async function InstructorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let instructor;
  try {
    instructor = await getInstructorBySlug(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const courses = await getCoursesByInstructor(instructor.fields.name || "");
  const portrait = firstAsset(instructor.fields.portrait);

  return (
    <article>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:py-24">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-surface">
          {portrait?.url ? (
            <Image
              src={portrait.url}
              alt={assetAlt(
                portrait,
                instructor.fields.name || "Northline instructor",
              )}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 42vw"
            />
          ) : null}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
            Northline instructor
          </p>
          <h1 className="mt-4 font-heading text-5xl font-semibold tracking-[-0.04em] text-ink sm:text-7xl">
            {instructor.fields.name}
          </h1>
          <p className="mt-4 text-lg font-bold text-ink">
            {instructor.fields.role}
          </p>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            {instructor.fields["short-bio"]}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {(instructor.fields.expertise ?? []).map((item) =>
              item.label ? (
                <span
                  key={item.label}
                  className="rounded-full bg-surface px-4 py-2 text-xs font-bold text-ink/65"
                >
                  {item.label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.72fr_1.28fr]">
          <h2 className="font-heading text-4xl font-semibold text-ink">
            About the instructor
          </h2>
          <RichText value={instructor.fields.biography} />
        </div>
      </section>

      {courses.length ? (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <h2 className="font-heading text-4xl font-semibold text-ink">
            Courses with {instructor.fields.name}
          </h2>
          <div className="mt-10 grid gap-7 md:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.uuid} course={course} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
