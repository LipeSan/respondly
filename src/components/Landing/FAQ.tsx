import React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../../ui/accordion";

const faqs = [
  {
    q: "How does Respondly connect to my Google Business Profile?",
    a: "You sign in with Google and choose your business location. Respondly uses Google's official Business Profile access to read reviews and post replies on your behalf, and you can disconnect it at any time from your account.",
  },
  {
    q: "When do replies go out?",
    a: "Once a day, in the evening (Sydney time). Respondly picks up the reviews that came in since the last run and posts the replies your rules call for.",
  },
  {
    q: "Will it reply to my old reviews?",
    a: "No. Only reviews posted after you connect are answered automatically, so your page never fills up with replies to old reviews overnight. Older reviews stay visible in your dashboard.",
  },
  {
    q: "Can I approve replies before they go live?",
    a: "Yes. Set any rule to manual and its replies wait as drafts until you read them and press publish. Other rules can stay fully automatic.",
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: "Starter replies with templates you write, one for each star rating, filled in with the customer's name and your details. Pro adds AI that reads each review and writes a reply about what the customer actually said, in their language.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every plan starts with 90 days free. You add a card to start, and if you cancel before day 90 you won't be charged.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes, from the Subscription page in your account. Your plan keeps working until the end of the period you've already paid for.",
  },
];

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