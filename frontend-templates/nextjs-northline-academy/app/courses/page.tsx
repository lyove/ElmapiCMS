import { CourseCard } from "@/components/course-card";
import { getCourses, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Courses",
    description:
      "Browse the Northline Academy catalog. Open lessons are free; member lessons show a teaser until you sign in.",
    path: "/courses",
  });
}

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
          Catalog
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
          Courses
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Open lessons show the full body to everyone. Member lessons keep the
          full content behind project user auth.
        </p>
      </div>
      <div className="mt-14 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.uuid} course={course} />
        ))}
      </div>
    </div>
  );
}
