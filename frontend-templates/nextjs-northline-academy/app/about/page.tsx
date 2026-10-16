import Image from "next/image";
import Link from "next/link";
import { InstructorCard } from "@/components/instructor-card";
import { Reveal } from "@/components/reveal";
import { RichText } from "@/components/rich-text";
import { Testimonial } from "@/components/testimonial";
import { buttonVariants } from "@/components/ui/button";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getAboutPage,
  getInstructors,
  getSiteSettings,
  getTestimonials,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getAboutPage(),
  ]);
  const hero = firstAsset(page.fields["hero-image"]);
  return buildMetadata({
    settings,
    title: page.fields["meta-title"] || page.fields.heading || "About",
    description: page.fields["meta-description"] || page.fields.intro,
    path: "/about",
    imageUrl: hero?.url,
  });
}

export default async function AboutPage() {
  const [page, instructors, testimonials] = await Promise.all([
    getAboutPage(),
    getInstructors(),
    getTestimonials(),
  ]);
  const hero = firstAsset(page.fields["hero-image"]);
  const story = testimonials[1] ?? testimonials[0];

  return (
    <div>
      <section className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              About Northline
            </p>
            <h1 className="mt-4 max-w-xl font-heading text-4xl font-semibold leading-[0.96] tracking-[-0.04em] text-ink sm:text-6xl lg:text-7xl">
              {page.fields.heading}
            </h1>
            {page.fields.intro ? (
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                {page.fields.intro}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className={cn(
                  buttonVariants(),
                  "bg-coral text-white hover:bg-coral/90",
                )}
              >
                Browse courses
              </Link>
              <Link
                href="/instructors"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Meet instructors
              </Link>
            </div>
          </Reveal>

          {hero?.url ? (
            <Reveal delay={1} className="relative">
              <div className="absolute -left-5 -top-5 size-28 rounded-full bg-coral/10" />
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-surface">
                <Image
                  src={hero.url}
                  alt={assetAlt(hero, "About Northline Academy")}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 52vw"
                />
              </div>
            </Reveal>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.95fr]">
          <div>
            {page.fields["mission-title"] ? (
              <h2 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                {page.fields["mission-title"]}
              </h2>
            ) : null}
            <RichText value={page.fields["mission-body"]} className="mt-5" />
          </div>
          <div className="divide-y divide-border border-y border-border">
            {(page.fields.values ?? []).map((value, index) => (
              <div
                key={value.title}
                className="grid grid-cols-[2.5rem_1fr] gap-4 py-7"
              >
                <span className="font-heading text-xl text-coral">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">{value.title}</h3>
                  {value.description ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {value.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(page.fields["approach-steps"]?.length ?? 0) > 0 ? (
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                Our approach
              </p>
              <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                {page.fields["approach-heading"]}
              </h2>
              {page.fields["approach-intro"] ? (
                <p className="mt-4 leading-7 text-muted-foreground">
                  {page.fields["approach-intro"]}
                </p>
              ) : null}
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-border md:grid-cols-3">
              {(page.fields["approach-steps"] ?? []).map((step, index) => (
                <div key={step.title} className="bg-white p-7 sm:p-8">
                  <span className="font-heading text-2xl text-coral">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-7 text-lg font-bold text-ink">
                    {step.title}
                  </h3>
                  {step.description ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {instructors.length ? (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                Faculty
              </p>
              <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                {page.fields["team-heading"]}
              </h2>
              {page.fields["team-intro"] ? (
                <p className="mt-4 leading-7 text-muted-foreground">
                  {page.fields["team-intro"]}
                </p>
              ) : null}
            </div>
            <Link
              href="/instructors"
              className="text-sm font-bold text-ink hover:text-coral"
            >
              View all instructors <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {instructors.slice(0, 3).map((instructor) => (
              <InstructorCard key={instructor.uuid} instructor={instructor} />
            ))}
          </div>
        </section>
      ) : null}

      {story ? (
        <section className="border-y border-border bg-coral/10 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-8 text-center text-xs font-bold uppercase tracking-[0.18em] text-coral">
              Member story
            </p>
            <Testimonial testimonial={story} />
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-ink px-8 py-12 text-white sm:px-12 sm:py-16">
          <div className="max-w-2xl">
            <h2 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              {page.fields["cta-heading"] || "Ready for a calmer way to learn?"}
            </h2>
            {page.fields["cta-body"] ? (
              <p className="mt-5 leading-7 text-white/65">
                {page.fields["cta-body"]}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className={cn(
                  buttonVariants(),
                  "bg-coral text-white hover:bg-coral/90",
                )}
              >
                Join as a member
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
