import { InstructorCard } from "@/components/instructor-card";
import { getInstructors, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Instructors",
    description:
      "Meet the practitioners who teach learning systems, writing, research, and facilitation at Northline Academy.",
    path: "/instructors",
  });
}

export default async function InstructorsPage() {
  const instructors = await getInstructors();

  return (
    <div>
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
            Northline faculty
          </p>
          <h1 className="mt-4 max-w-4xl font-heading text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl lg:text-7xl">
            Learn from people who do the work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Our instructors turn years of practice into short, specific
            lessons you can use in your next work session.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {instructors.map((instructor) => (
            <InstructorCard key={instructor.uuid} instructor={instructor} />
          ))}
        </div>
      </section>
    </div>
  );
}
