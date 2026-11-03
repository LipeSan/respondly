import React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../../ui/accordion";
import { FAQS } from "@/lib/faqs";


export default function FAQ() {
  return (
    <section id="faq" data-testid="faq-section" className="relative py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">Questions</span>
          <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            Questions before you start?
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-12 w-full">
          {FAQS.map((item, idx) => (
            <AccordionItem
              key={idx}
              value={`item-${idx}`}
              data-testid={`faq-item-${idx}`}
              className="border-white/10"
            >
              <AccordionTrigger className="font-heading text-left text-lg sm:text-xl font-semibold text-white hover:no-underline py-6">
                {item.q}
              </AccordionTrigger>
              <AccordionContent forceMount className="text-base text-zinc-400 leading-relaxed pb-6">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}