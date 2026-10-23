"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Nfc, Star, MessageSquareReply } from "lucide-react";
import { Button } from "@/components/Button";
import { PRODUCTS } from "@/lib/shop";

// No prices here on purpose: the shop catalogue still has placeholder prices.
// Products come from the catalogue so the names and photos stay in sync with the shop.

const steps = [
  {
    icon: Nfc,
    title: "Tap or scan",
    desc: "Customers tap their phone on the stand or card, or scan the QR code. No app needed.",
  },
  {
    icon: Star,
    title: "Leave a review",
    desc: "Your Google review page opens straight away, so it takes seconds while the visit is fresh.",
  },
  {
    icon: MessageSquareReply,
    title: "Respondly replies",
    desc: "The new review is picked up that evening and answered by your rules, like every other one.",
  },
];

const kit = PRODUCTS.find((p) => p.id === "starter-kit");
const singles = PRODUCTS.filter((p) => p.id !== "starter-kit");

export default function ReviewKit() {
  return (
    <section id="kit" data-testid="kit-section" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">In-store review kit</span>
            <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
              More reviews to reply to.{" "}
              <span className="text-zinc-400">One tap at the counter.</span>
            </h2>
            <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-xl">
              NFC stands, cards and stickers that open your Google review page with a tap or a scan. Put them where
              customers pay, and Respondly answers the reviews they bring in.
            </p>

            <ol className="mt-10 space-y-6">
              {steps.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex gap-4"
                >
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-green-500/20 border border-white/10">
                    <s.icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1 text-zinc-400 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.li>
              ))}
            </ol>

            <div className="mt-10">
              {/* The shop needs a login, so send visitors through it and land them on /shop. */}
              <Link href="/login?next=/shop" data-testid="kit-cta">
                <Button className="!w-auto !px-8">Go to shop</Button>
              </Link>
              <p className="mt-3 text-sm text-zinc-500">Log in or create an account to order.</p>
            </div>
          </div>

          {kit ? (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative rounded-3xl border border-white/10 bg-white p-6 sm:p-10"
              data-testid="kit-hero-image"
            >
              <Image
                src={kit.images[0]}
                alt={`${kit.name}: ${kit.details.slice(0, 2).join(" and ")}`}
                width={1200}
                height={1200}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="w-full h-auto object-contain"
              />
            </motion.div>
          ) : null}
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {singles.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3 hover:border-white/25 transition-all"
              data-testid={`kit-product-${p.id}`}
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  width={160}
                  height={160}
                  sizes="80px"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-semibold">{p.name}</h3>
                <p className="mt-0.5 text-sm text-zinc-400 leading-snug">{p.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
