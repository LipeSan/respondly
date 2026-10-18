"use client";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";


// The 90-day trial is the VIP90DAYS invite (the same one /promo/trial applies).
const TRIAL_CODE = "VIP90DAYS";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 9.99,
    tag: "Template-powered",
    description: "For a business that wants every review answered with consistent, on-brand replies.",
    features: [
      "Unlimited template replies",
      "A template for each star rating",
      "Replies posted automatically every evening",
      "Approve-first mode",
      "Dashboard with rating trends",
    ],
    cta: "Try Starter free",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.99,
    tag: "AI-powered",
    description: "For owners who want every reply to feel personal, written by AI that reads the review.",
    features: [
      "Everything in Starter",
      "AI replies written from each review",
      "Replies in the reviewer's language",
      "Your own tone and instructions for the AI",
    ],
    cta: "Try Pro free",
    highlight: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" data-testid="pricing-section" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">Pricing</span>
          <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            Simple plans. <span className="text-zinc-400">No setup fees.</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-zinc-400">
            Prices in AUD. Start with templates, switch to AI whenever you like, cancel any time.
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            Every plan starts with a 90-day free trial. Card required, cancel before day 90 and you won&apos;t be charged.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

type Plan = (typeof plans)[number];

function PlanCard({ plan, delay }: { plan: Plan; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      data-testid={`plan-${plan.id}`}
      className={`relative flex h-full flex-col rounded-2xl p-8 ${
        plan.highlight
          ? "border border-blue-500/40 bg-gradient-to-br from-blue-600/10 via-zinc-950 to-green-500/10 shadow-[0_0_60px_-15px_rgba(37,99,235,0.5)]"
          : "border border-white/10 bg-white/[0.02]"
      }`}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-8 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-green-500 px-3 py-1 text-xs font-semibold text-white">
          <Sparkles className="h-3 w-3" /> Most popular
        </span>
      )}
      <div className="flex items-baseline justify-between">
        <h3 className="font-heading text-2xl font-bold">{plan.name}</h3>
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">{plan.tag}</span>
      </div>
      <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-heading text-5xl font-bold">A${plan.price}</span>
        <span className="text-zinc-400">/mo</span>
      </div>

      <ul className="mt-6 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
            <Check className={`h-5 w-5 shrink-0 ${plan.highlight ? "text-green-400" : "text-zinc-400"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8" data-testid={`plan-${plan.id}-footer`}>
        <Link href={`/register?next=/start-trial&plan=${plan.id}&code=${TRIAL_CODE}`} data-testid={`plan-${plan.id}-cta`}>
          <Button
            className={`${
              plan.highlight
                ? "!text-white !bg-gradient-to-r !from-blue-600 !to-green-500 hover:!from-blue-500 hover:!to-green-400"
                : "!bg-white !text-black hover:!bg-zinc-200"
            }`}
          >
            {plan.cta}
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
