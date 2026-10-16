import Image from "next/image";
import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { InstructorCard } from "@/components/instructor-card";
import { LearningPathCard } from "@/components/learning-path-card";
import { Reveal } from "@/components/reveal";
import { Testimonial } from "@/components/testimonial";
import { buttonVariants } from "@/components/ui/button";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getCategories,
  getCourses,
  getHomePage,
  getInstructors,
  getLearningPaths,
  getSiteSettings,
  getTestimonials,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const [settings, home] = await Promise.all([
    getSiteSettings(),
    getHomePage(),
  ]);
  const hero = firstAsset(home.fields["hero-image"]);
  return buildMetadata({
    settings,
    title: home.fields["meta-title"] || undefined,
    description: home.fields["meta-description"] || home.fields.subheadline,
    path: "",
    imageUrl: hero?.url,
  });
}

export default async function HomePage() {
  const [home, courses, categories, paths, instructors, testimonials] =
    await Promise.all([
    getHomePage(),
    getCourses(),
    getCategories(),
    getLearningPaths(),
    getInstructors(),
    getTestimonials(),
  ]);
  const hero = firstAsset(home.fields["hero-image"]);
  const featured = courses.slice(0, 3);

  return (
    <div>
      <section className="relative isolate flex min-h-[calc(100dvh-73px)] flex-col overflow-hidden bg-ink text-white">
        {hero?.url ? (
          <div className="animate-image absolute inset-0">
            <Image
              src={hero.url}
              alt={assetAlt(hero, "Northline Academy learners")}
              fill
              priority
              className="object-cover object-[center_30%]"
              sizes="100vw"
            />
          </div>
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,31,58,0.88)_0%,rgba(11,31,58,0.78)_45%,rgba(11,31,58,0.55)_100%)] lg:bg-[linear-gradient(105deg,rgba(11,31,58,0.92)_0%,rgba(11,31,58,0.72)_42%,rgba(11,31,58,0.28)_72%,rgba(11,31,58,0.12)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink/55 to-transparent"
        />

        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-16 lg:py-20">
          <Reveal>
            {home.fields.eyebrow ? (
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-coral sm:mb-5">
                {home.fields.eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-3xl font-heading text-4xl font-semibold leading-[0.94] tracking-[-0.05em] sm:text-6xl lg:text-[5.25rem]">
              Northline Academy
            </h1>
          </Reveal>
          <Reveal delay={1}>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-snug text-white sm:mt-6 sm:text-2xl">
              {home.fields.headline}
            </p>
            {home.fields.subheadline ? (
              <p className="mt-3 max-w-lg text-sm leading-7 text-white/70 sm:mt-4 sm:text-base">
                {home.fields.subheadline}
              </p>
            ) : null}
          </Reveal>
          <Reveal delay={2} className="mt-7 flex flex-wrap gap-3 sm:mt-8">
            {home.fields["primary-cta-label"] &&
            home.fields["primary-cta-url"] ? (
              <Link
                href={home.fields["primary-cta-url"]}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 bg-coral px-5 text-white hover:bg-coral/90 sm:h-12 sm:px-6",
                )}
              >
                {home.fields["primary-cta-label"]}
              </Link>
            ) : null}
            {home.fields["secondary-cta-label"] &&
            home.fields["secondary-cta-url"] ? (
              <Link
                href={home.fields["secondary-cta-url"]}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-11 border-white/35 bg-white/5 px-5 text-white backdrop-blur-sm hover:bg-white/12 sm:h-12 sm:px-6",
                )}
              >
                {home.fields["secondary-cta-label"]}
              </Link>
            ) : null}
          </Reveal>
        </div>

        <div className="relative border-t border-white/15 bg-ink/45 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl gap-x-6 overflow-x-auto px-5 py-4 sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-3 sm:overflow-visible sm:px-8 sm:py-5">
            <span className="shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
              Explore by focus
            </span>
            {categories.map((category) => (
              <Link
                key={category.uuid}
                href="/courses"
                className="shrink-0 text-sm font-bold text-white transition-colors hover:text-coral"
              >
                {category.fields.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
              Featured learning
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            {home.fields["featured-heading"] || "Start with the catalog"}
            </h2>
            {home.fields["featured-intro"] ? (
              <p className="mt-4 text-muted-foreground">
              {home.fields["featured-intro"]}
              </p>
            ) : null}
          </div>
          <Link href="/courses" className="text-sm font-bold text-ink hover:text-coral">
            View all courses <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="mt-12 grid gap-7 md:grid-cols-3">
          {featured.map((course) => (
            <CourseCard key={course.uuid} course={course} />
          ))}
        </div>
      </section>

      <section className="bg-surface py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                Guided sequences
              </p>
              <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                {home.fields["paths-heading"] ||
                  "Follow a path, not a pile of courses"}
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                {home.fields["paths-intro"]}
              </p>
            </div>
            <Link href="/paths" className="text-sm font-bold text-ink hover:text-coral">
              Explore all paths <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="mt-12 grid gap-6 xl:grid-cols-2">
            {paths.slice(0, 2).map((path) => (
              <LearningPathCard key={path.uuid} path={path} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
              A useful rhythm
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              How membership works
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-3">
            {(home.fields.highlights ?? []).map((item, index) => (
              <div key={item.title} className="bg-white p-7">
                <span className="font-heading text-2xl text-coral">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-7 font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
              Your guides
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              {home.fields["instructors-heading"]}
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              {home.fields["instructors-intro"]}
            </p>
          </div>
          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {instructors.slice(0, 3).map((instructor) => (
              <InstructorCard key={instructor.uuid} instructor={instructor} />
            ))}
          </div>
        </div>
      </section>

      {testimonials[0] ? (
        <section className="bg-coral/10 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-8 text-center text-xs font-bold uppercase tracking-[0.18em] text-coral">
              {home.fields["stories-heading"]}
            </p>
            <Testimonial testimonial={testimonials[0]} />
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="my-24 overflow-hidden rounded-[2rem] bg-ink text-white">
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
              Northline membership
            </p>
            <h2 className="mt-4 max-w-xl font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              {home.fields["membership-heading"] || "Built for signed-in learners"}
            </h2>
            {home.fields["membership-body"] ? (
              <p className="mt-5 max-w-xl leading-7 text-white/65">
                {home.fields["membership-body"]}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className={cn(buttonVariants(), "bg-coral text-white hover:bg-coral/90")}
              >
                Create account
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-white/25 bg-transparent text-white hover:bg-white/10",
                )}
              >
                Compare plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
