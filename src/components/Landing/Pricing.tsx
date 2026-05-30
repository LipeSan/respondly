"use client";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";


const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 9.99,
    tag: "Template-powered",
    description: "Perfect for solo operators and single-location businesses who want speed and consistency.",
    features: [
      "Unlimited template replies",
      "Smart template library by rating",
      "Basic analytics",
    ],
    cta: "Get Starter",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.99,
    tag: "AI-powered",
    description: "For teams who want every reply to feel personal — written by AI that actually reads the review.",
    features: [
      "Everything in Starter",
      "AI that reads & understands reviews",
      "Multilingual auto-replies (40+ langs)",
      "1-click approve workflow",
      "Fake review auto-flag",
    ],
    cta: "Get Pro",
    highlight: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" data-testid="pricing-section" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-semibold">Pricing</span>
          <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            Simple plans. <span className="gradient-text">Real ROI.</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-zinc-400">
            No setup fees. Cancel anytime. Start with templates, upgrade to AI when you want it on autopilot.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Includes a 30-day free trial. Card required.
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
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{plan.tag}</span>
      </div>
      <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-heading text-5xl font-bold">${plan.price}</span>
        <span className="text-zinc-500">/mo</span>
      </div>

      <ul className="mt-6 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
            <Check className={`h-5 w-5 shrink-0 ${plan.highlight ? "text-green-400" : "text-zinc-500"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8" data-testid={`plan-${plan.id}-footer`}>
        <Link href="/register?next=/start-trial" data-testid={`plan-${plan.id}-cta`}>
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
