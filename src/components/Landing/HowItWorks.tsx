"use client";

import React from "react";
import { motion } from "framer-motion";
import { Plug, BrainCircuit, Send } from "lucide-react";

const steps = [
  {
    icon: Plug,
    title: "Connect",
    desc: "Link your Google Business Profile in under a minute. We pull reviews automatically — no scraping, no copy-paste.",
  },
  {
    icon: BrainCircuit,
    title: "Understand",
    desc: "Pro plan reads each review with AI — detects tone, intent, language and the actual issue raised.",
  },
  {
    icon: Send,
    title: "Reply",
    desc: "Auto-publish on-brand answers, or approve in one click. Every customer feels heard. Every star rebuilds trust.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" data-testid="how-section" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">How it works</span>
          <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            Three steps. <span className="text-zinc-400">That&apos;s it.</span>
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 group hover:border-white/25 transition-all"
              data-testid={`how-step-${i}`}
            >
              <div className="absolute top-6 right-6 font-heading text-7xl font-bold text-white/5 group-hover:text-white/10 transition">
                0{i + 1}
              </div>
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-green-500/20 border border-white/10">
                  <s.icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="font-heading mt-6 text-2xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
