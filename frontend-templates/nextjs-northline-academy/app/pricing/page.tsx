import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import { getFaqs, getPlans, getPricingPage, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getPricingPage(),
  ]);
  return buildMetadata({
    settings,
    title: page.fields["meta-title"] || page.fields.heading || "Pricing",
    description: page.fields["meta-description"] || page.fields.intro,
    path: "/pricing",
  });
}

export default async function PricingPage() {
  const [page, plans, faqs] = await Promise.all([
    getPricingPage(),
    getPlans(),
    getFaqs(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
          Pricing
        </p>
        <h1 className="mt-4 font-heading text-5xl font-semibold tracking-tight sm:text-7xl">
          {page.fields.heading}
        </h1>
        {page.fields.intro ? (
          <p className="mt-5 text-lg text-muted-foreground">{page.fields.intro}</p>
        ) : null}
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const highlighted = Boolean(plan.fields.highlighted);
          return (
            <div
              key={plan.uuid}
              className={cn(
                "relative flex flex-col rounded-xl border p-7",
                highlighted
                  ? "border-ink bg-ink text-white shadow-[0_18px_50px_rgba(11,31,58,0.16)]"
                  : "border-border bg-white",
              )}
            >
              {highlighted ? (
                <span className="absolute right-5 top-5 rounded-md bg-coral px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most popular
                </span>
              ) : null}
              <h2 className="font-heading text-2xl font-semibold">
                {plan.fields.name}
              </h2>
              <p className="mt-3 font-heading text-4xl font-semibold tracking-tight">
                {plan.fields["price-label"]}
              </p>
              {plan.fields["billing-note"] ? (
                <p
                  className={cn(
                    "mt-1 text-sm",
                    highlighted ? "text-white/60" : "text-muted-foreground",
                  )}
                >
                  {plan.fields["billing-note"]}
                </p>
              ) : null}
              {plan.fields.summary ? (
                <p
                  className={cn(
                    "mt-4 text-sm leading-relaxed",
                    highlighted ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {plan.fields.summary}
                </p>
              ) : null}
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {(plan.fields.features ?? []).map((feature) => (
                  <li key={feature.label} className="flex gap-2">
                    <span aria-hidden className="font-bold text-coral">
                      ✓
                    </span>
                    <span>{feature.label}</span>
                  </li>
                ))}
              </ul>
              {plan.fields["cta-label"] && plan.fields["cta-url"] ? (
                <Link
                  href={plan.fields["cta-url"]}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-8 w-full",
                    highlighted
                      ? "bg-coral text-white hover:bg-coral/90"
                      : "",
                  )}
                >
                  {plan.fields["cta-label"]}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      {faqs.length > 0 ? (
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 className="font-heading text-4xl font-semibold tracking-tight">
            {page.fields["faq-heading"] || "Membership questions"}
          </h2>
          <Accordion className="mt-8 border-t border-border">
            {faqs.map((faq) => (
              <AccordionItem key={faq.uuid} value={faq.uuid}>
                <AccordionTrigger>{faq.fields.question}</AccordionTrigger>
                <AccordionContent>
                  <RichText value={faq.fields.answer} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : null}
    </div>
  );
}
