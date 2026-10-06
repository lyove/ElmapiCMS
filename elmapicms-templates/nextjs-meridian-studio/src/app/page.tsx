import Link from "next/link";
import { HeroSection } from "@/components/hero-section";
import { ServicesGrid, WorkCard } from "@/components/content-blocks";
import { SectionHeading } from "@/components/page-intro";
import { TestimonialsSection } from "@/components/testimonials-section";
import { InsightCard } from "@/components/team-insights";
import { Reveal } from "@/components/reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { assetAlt, firstAsset } from "@/lib/assets";
import {
  getFeaturedCaseStudies,
  getHomeHero,
  getInsights,
  getServices,
  getSiteSettings,
  getTestimonials,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({ settings, path: "/" });
}

export default async function HomePage() {
  const [hero, featuredWork, services, testimonials, insights] = await Promise.all([
    getHomeHero(),
    getFeaturedCaseStudies(),
    getServices(),
    getTestimonials(),
    getInsights(),
  ]);

  const latestInsights = insights.slice(0, 2);

  return (
    <>
      <HeroSection hero={hero} />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Selected work"
            title="Case studies that moved the needle"
            description="Brand, product, and campaign work for teams who expect craft and velocity."
            action={
              <Link
                href="/work"
                className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
              >
                View all work
              </Link>
            }
          />
        </Reveal>
        <div className="grid gap-8 md:grid-cols-2">
          {featuredWork.map((study, index) => {
            const image = firstAsset(study.fields["featured-image"]);
            return (
              <Reveal key={study.uuid} delayMs={index * 80}>
                <WorkCard
                  title={study.fields.title}
                  slug={study.fields.slug}
                  excerpt={study.fields.excerpt}
                  client={study.fields.client}
                  industry={study.fields.industry}
                  imageUrl={image?.url}
                  imageAlt={assetAlt(image, study.fields.title || "Case study")}
                />
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border/40 bg-card/20 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Capabilities"
              title="What we do"
              description="Strategy, design, and engineering, integrated from day one."
            />
          </Reveal>
          <Reveal delayMs={100}>
            <ServicesGrid services={services} />
          </Reveal>
        </div>
      </section>

      <Reveal>
        <TestimonialsSection testimonials={testimonials} />
      </Reveal>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Insights"
            title="Thinking out loud"
            action={
              <Link
                href="/insights"
                className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
              >
                All insights
              </Link>
            }
          />
        </Reveal>
        <div className="grid gap-8 md:grid-cols-2">
          {latestInsights.map((post, index) => {
            const image = firstAsset(post.fields["featured-image"]);
            return (
              <Reveal key={post.uuid} delayMs={index * 80}>
                <InsightCard
                  title={post.fields.title}
                  slug={post.fields.slug}
                  excerpt={post.fields.excerpt}
                  category={post.fields.category}
                  authorName={post.fields.author?.fields.name}
                  publishedAt={post.published_at}
                  imageUrl={image?.url}
                />
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}
