"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Languages, Shield, Moon, FileText, LayoutDashboard, History } from "lucide-react";

const FEATURE_ICON_3D =
  "https://static.prod-images.emergentagent.com/jobs/17dcd17d-45d3-4f6d-87e8-719aa8db2423/images/6b288d0ef88fb4807ed6e9d4109c2ccf5be5d6f4075bc459133c47bd26327044.png";

export default function Features() {
  return (
    <section id="features" data-testid="features-section" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">Features</span>
          <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            Templates when you want consistency.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">AI when you want it personal.</span>
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
            <div className="absolute -right-10 -bottom-10 w-40 h-40 sm:w-56 sm:h-56 opacity-80">
              <Image
                src={FEATURE_ICON_3D}
                alt=""
                aria-hidden
                fill
                sizes="256px"
                className="object-contain"
              />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-blue-300">Pro Plan</span>
            <h3 className="font-heading mt-4 text-3xl font-bold max-w-md leading-tight">
              AI that reads the review and replies to what they actually said.
            </h3>
            <p className="mt-4 max-w-md text-zinc-400">
              A thank-you that mentions the banana bread. An apology that addresses the long wait. Pro writes each reply
              from the review itself, in the tone and with the instructions you set.
            </p>
            <div className="relative z-10 mt-6 flex max-w-sm flex-wrap gap-2 pr-16 sm:pr-0">
              {["Reads every review", "Replies in their language", "Your tone & instructions", "Approve first if you like"].map((t) => (
                <span key={t} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <FeatureCard icon={FileText} title="A template per star rating" desc="Thank five-star fans, apologise to one-star reviews. Templates fill in the customer's name and your contact details." testid="feature-templates" />
          <FeatureCard icon={Moon} title="Every evening, automatically" desc="New reviews are picked up and answered once a day. No app to open, nothing to remember." testid="feature-schedule" />
          <FeatureCard icon={Languages} title="Their language (Pro)" desc="A review in Portuguese or Mandarin gets a reply in Portuguese or Mandarin." testid="feature-langs" />
          <FeatureCard icon={Shield} title="Approve before it posts" desc="Turn any rule to manual and replies wait as drafts until you publish them." testid="feature-approve" />
          <FeatureCard icon={LayoutDashboard} title="A dashboard that shows what matters" desc="Automation status, rating trend, reviews waiting for you and low ratings without a reply, all on one screen." testid="feature-dashboard" wide />
          <FeatureCard icon={History} title="Only new reviews" desc="Respondly answers reviews posted after you connect, so your page never fills up with replies to years-old reviews." testid="feature-new-only" wide />
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
