"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/Button";

const HERO_BG =
  "https://static.prod-images.emergentagent.com/jobs/17dcd17d-45d3-4f6d-87e8-719aa8db2423/images/4ecbf194628f52651df8101b38e3e476a0be2be45e3e4ca4aad16754f0ad3632.png";

type LeadPayload = {
  email: string;
  source?: string;
};

async function submitLead(payload: LeadPayload) {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
  } catch {
    return;
  }
}

export default function Hero() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    setSubmitting(true);
    try {
      await submitLead({ email: email.trim(), source: "hero" });
      toast.success("You're on the list — we'll be in touch soon.");
      setEmail("");
    } catch {
      toast.error("Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="top" data-testid="hero-section" className="relative pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        <div className="aurora" />
        <div className="grain" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-7"
        >
          <span data-testid="hero-badge" className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-inset ring-blue-500/30 uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5" /> AI for Google Reviews
          </span>

          <h1 data-testid="hero-title" className="font-heading mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tighter">
            Never let a Google review go <span className="gradient-text">unanswered</span> again.
          </h1>

          <p data-testid="hero-subtitle" className="mt-6 max-w-xl text-lg text-zinc-400 leading-relaxed">
            Respondly replies to every Google review for you — with on-brand templates or AI that actually reads, understands and responds. Reclaim hours every week, protect your rating, and turn every star into trust.
          </p>

          {/* <form data-testid="hero-lead-form" onSubmit={onSubmit} className="mt-10 flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              data-testid="hero-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@business.com"
              className="flex-1 rounded-lg bg-zinc-900/70 border border-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <div className="sm:min-w-48">
              <Button
                data-testid="hero-submit-btn"
                type="submit"
                disabled={submitting}
                isLoading={submitting}
                className="shadow-[0_0_30px_-6px_rgba(34,197,94,0.55)]"
              >
                Get Early Access <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form> */}

          <div className="mt-4 max-w-lg">
            <Link href="/register">
              <Button variant="outline" className="!w-auto !px-6 !py-3 !bg-transparent !text-white !border-white/20 hover:!border-white/40">
                Start for Free
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-3 text-xs text-zinc-500">
            <div className="flex">
              {[0,1,2,3,4].map((i)=>(<Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />))}
            </div>
            <span>Trusted by local businesses & multi-location brands</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-md p-5 shadow-[0_30px_90px_-30px_rgba(37,99,235,0.6)]">
            <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-blue-600/30 to-green-500/30 blur-xl" />
            <ReviewSimulator />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ReviewSimulator() {
  return (
    <div data-testid="hero-review-card" className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Live preview</span>
        <span className="text-xs text-green-400">● AI Pro</span>
      </div>

      <div className="rounded-xl bg-black/60 border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">M</div>
          <div>
            <p className="text-sm font-semibold">Marina S.</p>
            <div className="flex gap-0.5">
              {[0,1,2].map((i)=>(<Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />))}
              {[0,1].map((i)=>(<Star key={i} className="h-3 w-3 text-zinc-700" />))}
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-300">Coffee was great but I waited 15 minutes for it. Staff seemed busy.</p>
      </div>

      <div className="flex items-center justify-center text-xs text-zinc-500 gap-2">
        <span className="h-px w-8 bg-zinc-800" />
        AI replies in 3.2s
        <span className="h-px w-8 bg-zinc-800" />
      </div>

      <div className="rounded-xl bg-gradient-to-br from-blue-600/15 to-green-500/10 border border-blue-500/30 p-4">
        <p className="text-xs text-blue-300 mb-2 font-semibold">Respondly · Pro</p>
        <p className="text-sm text-white leading-relaxed">
          Hi Marina, thank you for being honest — and we&apos;re sorry about the wait. Our team was short-handed that
          afternoon, but it&apos;s no excuse. Coffee should always come with a smile, not a stopwatch. Next time, ask for
          Lucas at the counter — your next one is on us. ☕
        </p>
      </div>
    </div>
  );
}
