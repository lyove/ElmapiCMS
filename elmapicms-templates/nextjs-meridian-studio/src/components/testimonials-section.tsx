import type { ContentEntry, TestimonialFields } from "@/lib/types";

type TestimonialsSectionProps = {
  testimonials: ContentEntry<TestimonialFields>[];
};

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="border-y border-border/40 bg-card/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Client voices</p>
        <h2 className="font-heading mt-3 max-w-xl text-3xl font-semibold md:text-4xl">
          Trusted by teams who ship ambitious work
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <blockquote
              key={item.uuid}
              className="flex h-full flex-col rounded-2xl border border-border/50 bg-background/60 p-6"
            >
              <p className="flex-1 text-sm leading-relaxed text-foreground/90">
                &ldquo;{item.fields.quote}&rdquo;
              </p>
              <footer className="mt-6 border-t border-border/40 pt-4">
                <cite className="not-italic">
                  <span className="block text-sm font-medium">{item.fields["author-name"]}</span>
                  <span className="text-xs text-muted-foreground">
                    {[item.fields["author-role"], item.fields.company].filter(Boolean).join(" · ")}
                  </span>
                </cite>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
