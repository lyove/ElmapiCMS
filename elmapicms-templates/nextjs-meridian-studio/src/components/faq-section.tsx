import type { ContentEntry, FaqFields } from "@/lib/types";

type FaqSectionProps = {
  faqs: ContentEntry<FaqFields>[];
};

export function FaqSection({ faqs }: FaqSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <div className="divide-y divide-border/50 border-y border-border/50">
      {faqs.map((faq) => (
        <details key={faq.uuid} className="group py-4">
          <summary className="cursor-pointer list-none text-base font-medium marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-4">
              {faq.fields.question}
              <span className="text-muted-foreground transition group-open:rotate-45">+</span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.fields.answer}</p>
        </details>
      ))}
    </div>
  );
}
