"use client";

import React from "react";
import { motion } from "framer-motion";

const MOCKUP =
  "https://static.prod-images.emergentagent.com/jobs/17dcd17d-45d3-4f6d-87e8-719aa8db2423/images/465c638a1f84c63e390dc7ac4b196386f9a2835ba37bd2fe3246356090f2c756.png";

export default function MockupShowcase() {
  return (
    <section data-testid="mockup-section" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
        <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">One dashboard</span>
        <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
          Your reviews. <span className="gradient-text">Auto-piloted.</span>
        </h2>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400">
          Connect your Google Business Profile in 30 seconds. Watch every review get a thoughtful reply — without lifting a finger.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative mt-16 mx-auto max-w-5xl"
        >
          <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-gradient-to-r from-blue-600/30 via-purple-500/0 to-green-500/30 blur-3xl" />
          <div className="relative rounded-2xl border border-white/10 bg-zinc-950/60 p-2 shadow-[0_50px_150px_-30px_rgba(34,197,94,0.35)]">
            <img
              src={MOCKUP}
              alt="Respondly dashboard mockup"
              className="w-full h-auto rounded-xl"
              data-testid="mockup-image"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
