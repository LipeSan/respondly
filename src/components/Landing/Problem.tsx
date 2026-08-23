"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, TrendingDown } from "lucide-react";

const stats = [
  { icon: Clock, value: "5+ hrs", label: "wasted weekly replying to reviews" },
  { icon: AlertTriangle, value: "73%", label: "of negative reviews never get a reply" },
  { icon: TrendingDown, value: "−18%", label: "in conversions for unresponsive businesses" },
];

export default function Problem() {
  return (
    <section data-testid="problem-section" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">The Reality</span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl"
        >
          Every unanswered review is a customer you&apos;re <span className="text-red-400">losing in silence</span>.
        </motion.h2>
        <p className="mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
          Google reviews shape who walks through your door. Yet most teams reply late, on weekends, or never. That&apos;s
          revenue leaking — slowly, then all at once.
        </p>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.value}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 hover:border-white/20 transition-colors"
              data-testid={`problem-stat-${i}`}
            >
              <s.icon className="h-7 w-7 text-zinc-400" />
              <p className="font-heading mt-6 text-4xl font-bold text-white">{s.value}</p>
              <p className="mt-2 text-sm text-zinc-400">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
