"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/Button";

export default function FinalCTA() {
  return (
    <section id="cta" data-testid="cta-section" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="absolute inset-0 -z-0">
        <div className="aurora opacity-60" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-heading text-4xl sm:text-6xl font-bold tracking-tight"
        >
          Let AI <span className="gradient-text">handle the replies.</span><br />
          You handle the customers.
        </motion.h2>

        <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto">
          Start today. We&apos;ll set up your first 100 replies on us.
        </p>

        <div className="mt-10 flex justify-center" data-testid="final-cta-actions">
          <Link href="/register" data-testid="final-cta-join">
            <Button className="!w-auto !px-10">Join</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
