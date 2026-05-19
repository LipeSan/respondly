import React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../../ui/accordion";

const faqs = [
  {
    q: "How does Respondly connect to my Google Business Profile?",
    a: "We use the official Google Business Profile API. A one-click OAuth flow grants Respondly permission to read reviews and post replies on your behalf. You can revoke access anytime.",
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: "Starter uses smart template libraries — fast, consistent and on-brand. Pro plugs in our AI engine: it reads each review, detects tone & language, and writes a tailored reply that sounds like your team.",
  },
  {
    q: "Can I approve replies before they go live?",
    a: "Yes. Both plans support fully automatic mode or a 'human-in-the-loop' workflow where every reply waits for your 1-click approval.",
  },
  {
    q: "What languages does the AI support?",
    a: "Pro replies natively in 40+ languages including English, Portuguese, Spanish, French, German, Italian, Japanese and Mandarin. It detects the review language automatically.",
  },
//   {
//     q: "Is there a free trial?",
//     a: "Yes — every plan starts with a 14-day free trial. No credit card required. Cancel anytime, keep the templates.",
//   },
  {
    q: "What happens with fake or abusive reviews?",
    a: "Respondly auto-flags suspicious reviews and prepares the documentation for Google's removal appeal — saving you hours of back-and-forth.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" data-testid="faq-section" className="relative py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-semibold">Questions</span>
          <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            Things people ask before signing up.
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-12 w-full">
          {faqs.map((item, idx) => (
            <AccordionItem
              key={idx}
              value={`item-${idx}`}
              data-testid={`faq-item-${idx}`}
              className="border-white/10"
            >
              <AccordionTrigger className="font-heading text-left text-lg sm:text-xl font-semibold text-white hover:no-underline py-6">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-base text-zinc-400 leading-relaxed pb-6">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}