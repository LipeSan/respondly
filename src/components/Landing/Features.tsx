"use client";

import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Languages, Shield, Zap, FileText, BarChart3, Bot } from "lucide-react";

const FEATURE_ICON_3D =
  "https://static.prod-images.emergentagent.com/jobs/17dcd17d-45d3-4f6d-87e8-719aa8db2423/images/6b288d0ef88fb4807ed6e9d4109c2ccf5be5d6f4075bc459133c47bd26327044.png";

export default function Features() {
  return (
    <section id="features" data-testid="features-section" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-semibold">Built for response</span>
          <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            Templates when you need speed. <span className="gradient-text">AI when you need nuance.</span>
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(220px,auto)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            data-testid="feature-ai"
            className="relative md:col-span-2 lg:col-span-2 lg:row-span-2 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/10 via-zinc-950 to-green-500/10 p-8 overflow-hidden group"
          >
            <div className="absolute -right-10 -bottom-10 w-64 h-64 opacity-80">
              <img src={FEATURE_ICON_3D} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-blue-300">Pro Plan</span>
            <h3 className="font-heading mt-4 text-3xl font-bold max-w-md leading-tight">
              AI that reads, interprets, and replies — in your voice.
            </h3>
            <p className="mt-4 max-w-md text-zinc-400">
              Tone-aware. Multilingual. Context-driven. The Pro AI understands when a customer is frustrated, sarcastic, or just confused — and answers like your best teammate would.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Sentiment detection", "Multi-language", "Brand voice", "Issue routing"].map((t) => (
                <span key={t} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <FeatureCard icon={FileText} title="Smart Templates" desc="Starter plan. Pre-built libraries by rating & category. Customize once, deploy everywhere." testid="feature-templates" />
          <FeatureCard icon={Zap} title="Reply in seconds" desc="Average response time under 5 seconds. Your customers feel heard instantly." testid="feature-speed" />
          <FeatureCard icon={Languages} title="Multilingual" desc="Detects 40+ languages and replies natively. No clunky translations." testid="feature-langs" />
          <FeatureCard icon={Shield} title="1-Click Approve" desc="Want the human-in-the-loop? Review every AI draft before it goes live." testid="feature-approve" />
          <FeatureCard icon={BarChart3} title="Insights" desc="See sentiment trends, recurring complaints, and what your top reviewers love." testid="feature-insights" wide />
          <FeatureCard icon={Bot} title="Auto-flagging" desc="Suspect a fake or abusive review? Respondly flags it and prepares your Google appeal." testid="feature-flag" wide />
        </div>
      </div>
    </section>
  );
}

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  desc: string;
  wide?: boolean;
  testid: string;
};

function FeatureCard({ icon: Icon, title, desc, wide, testid }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      data-testid={testid}
      className={`rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/25 transition-colors ${
        wide ? "md:col-span-1 lg:col-span-2" : ""
      }`}
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10">
        <Icon className="h-5 w-5 text-green-400" />
      </div>
      <h4 className="font-heading mt-5 text-xl font-semibold">{title}</h4>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
