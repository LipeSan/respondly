"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const rows = [
  {
    before: "Replying to reviews late at night, or forgetting for weeks",
    after: "Every new review gets a reply the same evening",
  },
  {
    before: "One-star reviews sitting there unanswered for everyone to see",
    after: "Unhappy customers get an apology and a way to reach you",
  },
  {
    before: "Copy-pasting the same “Thanks for your review!” every time",
    after: "Replies that use their name, your details, or what they actually said",
  },
  {
    before: "Worrying what an automated reply might say",
    after: "Approve-first mode: nothing posts until you've read it",
  },
];

export default function BeforeAfter() {
  return (
    <section data-testid="before-after-section" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">Why owners switch</span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl"
        >
          Your customers read your replies. <span className="text-zinc-400">Make sure there is one.</span>
        </motion.h2>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-8"
          >
            <p className="font-heading text-xl font-semibold text-zinc-300">Without Respondly</p>
            <ul className="mt-6 space-y-5">
              {rows.map((row) => (
                <li key={row.before} className="flex items-start gap-3 text-zinc-400">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <X className="h-4 w-4 text-red-400" />
                  </span>
                  <span>{row.before}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-zinc-950 to-blue-600/10 p-8"
          >
            <p className="font-heading text-xl font-semibold">With Respondly</p>
            <ul className="mt-6 space-y-5">
              {rows.map((row) => (
                <li key={row.after} className="flex items-start gap-3 text-white">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                    <Check className="h-4 w-4 text-green-400" />
                  </span>
                  <span>{row.after}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
