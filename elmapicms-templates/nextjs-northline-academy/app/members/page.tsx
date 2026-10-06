import { CourseCard } from "@/components/course-card";
import { LogoutButton } from "@/components/logout-button";
import { auth } from "@/auth";
import { getCourses, getMemberCourses } from "@/lib/content";

export default async function MembersPage() {
  const session = await auth();
  const [allCourses, memberCourses] = await Promise.all([
    getCourses(),
    getMemberCourses(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-8 rounded-[2rem] bg-ink p-8 text-white sm:p-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            Member library
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold tracking-tight">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="mt-4 max-w-2xl text-white/60">
            Your member lessons are ready. Open any course below to continue
            learning, or browse the full catalog for something new.
          </p>
        </div>
        <LogoutButton />
      </div>

      <section className="mt-16">
        <h2 className="font-heading text-4xl font-semibold tracking-tight">
          Member lessons
        </h2>
        <div className="mt-8 grid gap-7 md:grid-cols-2">
          {memberCourses.map((course) => (
            <CourseCard key={course.uuid} course={course} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-heading text-4xl font-semibold tracking-tight">
          Full catalog
        </h2>
        <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {allCourses.map((course) => (
            <CourseCard key={course.uuid} course={course} />
          ))}
        </div>
      </section>
    </div>
  );
}
