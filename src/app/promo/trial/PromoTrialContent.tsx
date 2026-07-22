"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Gift, ShieldCheck, Sparkles, Zap } from "lucide-react";
import Header from "@/components/Landing/Header";
import Footer from "@/components/Landing/Footer";
import { PromoSignupCard } from "@/app/promo/trial/PromoSignupCard";

const highlights = [
  {
    icon: Gift,
    eyebrow: "Limited offer",
    title: "90 days to automate everything",
    description: "Join with the campaign active and validate the product with enough time to test setup, team workflow and ROI.",
  },
  {
    icon: Zap,
    eyebrow: "Speed",
    title: "Google Reviews on autopilot",
    description: "Templates, AI, and operations in one place so you can reply faster and stay consistent.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Low risk",
    title: "Card required, no lock-in",
    description: "Activate the trial through real checkout, monitor results, and cancel anytime before renewal.",
  },
];

const proofPoints = [
  "Replies with your brand voice",
  "Simple signup → business → checkout flow",
  "Offer tied to the same trial invite system",
  "Same premium theme as the main landing",
];

export function PromoTrialContent() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <Header showNav={false} />

      <section id="top" className="relative overflow-hidden border-b border-white/5 pt-32 pb-24 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(34,197,94,0.18),transparent_24%),linear-gradient(180deg,#040404_0%,#09090b_45%,#000000_100%)]" />
          <div className="aurora opacity-70" />
          <div className="grain" />
        </div>

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-14 px-6 lg:grid-cols-12 lg:items-start lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75 }}
            className="lg:col-span-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300 ring-1 ring-inset ring-blue-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              Special offer
            </span>

            <h1 className="font-heading mt-6 max-w-4xl text-5xl font-bold leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl">
              Same workflow. <span className="gradient-text">90 extra days</span> to prove ROI.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              This promo page keeps the same look & feel as our main landing, but is optimized for conversion: create your
              account, apply the promo code, and start automating Google Reviews.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#signup"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-green-500 px-8 py-3 text-sm font-bold text-white shadow-[0_0_30px_-6px_rgba(34,197,94,0.55)] transition hover:-translate-y-0.5 hover:from-blue-800 hover:to-green-600"
              >
                Claim 90 days free
              </a>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                See main landing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {proofPoints.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <div id="signup">
              <PromoSignupCard />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative border-b border-white/5 py-24 sm:py-28">
        <div className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Why this page converts</span>
          <h2 className="font-heading mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            The same visual universe. <span className="gradient-text">A more direct conversation.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-zinc-400">
            Instead of repeating the full homepage story, this version compresses the narrative for campaigns: a clear
            offer, a tight explanation, and a signup card that goes straight into the real product flow.
          </p>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {highlights.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-8"
              >
                <item.icon className="h-6 w-6 text-zinc-300" />
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{item.eyebrow}</p>
                <h3 className="font-heading mt-4 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_25%),radial-gradient(circle_at_70%_40%,rgba(34,197,94,0.1),transparent_22%)]" />
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Campaign-ready</p>
          <h2 className="font-heading mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Send traffic to an offer that <span className="gradient-text">continues inside the product.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            If you like this direction, we can make it even closer to the main landing by adding a real mockup section,
            extra narrative blocks, and a dedicated CTA from the homepage.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
