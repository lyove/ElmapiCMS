import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RichText } from "@/components/rich-text";
import { getFaqItems, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "FAQ",
    description: "Common questions about Sable Goods orders and products.",
    path: "/faq",
  });
}

export default async function FaqPage() {
  const faqs = await getFaqItems();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="eyebrow">Help</p>
      <h1 className="section-title mt-3">
        Frequently asked questions
      </h1>
      <div className="mt-8 border-t border-border" />

      {faqs.length === 0 ? (
        <p className="mt-10 text-stone">No FAQ entries yet.</p>
      ) : (
        <Accordion className="mt-10 w-full border-t border-border">
          {faqs.map((item) => (
            <AccordionItem key={item.uuid} value={item.uuid}>
              <AccordionTrigger className="text-left font-medium text-ink">
                {item.fields.question}
              </AccordionTrigger>
              <AccordionContent>
                <RichText value={item.fields.answer} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
