import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import type { HighlightItem } from "@/lib/types";

type HighlightsGridProps = {
  highlights: HighlightItem[];
};

export function HighlightsGrid({ highlights }: HighlightsGridProps) {
  if (highlights.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {highlights.map((item, index) => (
        <Reveal key={item.title} delayMs={index * 80}>
          <div className="h-full rounded-lg border border-border bg-card p-6">
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-md bg-accent/15 text-accent">
              <Icon name={item.icon} className="size-5" />
            </div>
            <p className="font-heading text-lg font-semibold">{item.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
