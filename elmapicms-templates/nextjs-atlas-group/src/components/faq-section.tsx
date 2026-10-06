import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichText } from "@/components/rich-text";
import type { ContentEntry, FaqFields } from "@/lib/types";

type FaqSectionProps = {
  faqs: ContentEntry<FaqFields>[];
};

export function FaqSection({ faqs }: FaqSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <Accordion className="border-t border-border">
      {faqs.map((faq) => (
        <AccordionItem key={faq.uuid} value={faq.uuid}>
          <AccordionTrigger className="font-heading text-base">
            {faq.fields.question}
          </AccordionTrigger>
          <AccordionContent>
            <RichText value={faq.fields.answer} className="text-sm" />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
