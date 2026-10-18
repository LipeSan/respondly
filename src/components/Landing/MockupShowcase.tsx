"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Star } from "lucide-react";

// A faithful, static recreation of the real customer dashboard (status banner,
// KPIs, chart, rating breakdown, latest reviews) with example numbers, shown
// instead of a generic illustration.

const kpis = [
  { label: "Average rating", value: "4.7", suffix: "/ 5", delta: "▲ 0.2 vs previous period", good: true },
  { label: "New reviews", value: "19", delta: "▲ 5 vs previous period", good: true },
  { label: "Replies sent", value: "18", delta: "▲ 6 vs previous period", good: true },
  { label: "Avg. reply time", value: "9h", delta: "▼ 2h vs previous period", good: true },
];

const weeks = [
  { label: "22 Sep", replied: 3, notReplied: 0 },
  { label: "29 Sep", replied: 4, notReplied: 0 },
  { label: "6 Oct", replied: 2, notReplied: 1 },
  { label: "13 Oct", replied: 5, notReplied: 0 },
  { label: "20 Oct", replied: 4, notReplied: 0 },
];

const distribution = [
  { star: 5, count: 41 },
  { star: 4, count: 9 },
  { star: 3, count: 3 },
  { star: 2, count: 1 },
  { star: 1, count: 2 },
];

const latest = [
  { name: "Chloe W.", rating: 5, text: "Best banana bread in the area and the staff remembered my order.", status: "Replied" },
  { name: "Daniel K.", rating: 4, text: "Great coffee, a bit pricey for a large. Will be back though.", status: "Replied" },
  { name: "Marina S.", rating: 2, text: "Coffee was great but I waited 15 minutes for it.", status: "Draft" },
];

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= n ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
      ))}
    </span>
  );
}

function DashboardMock() {
  const maxWeek = Math.max(...weeks.map((w) => w.replied + w.notReplied));
  const maxDist = Math.max(...distribution.map((d) => d.count));

  return (
    <div className="rounded-xl bg-gray-50 p-4 sm:p-6 text-left text-gray-900" aria-hidden="true">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-bold tracking-tight text-gray-800">Dashboard</p>
          <p className="text-sm text-gray-500">Bondi Bean Co.</p>
        </div>
        <div className="hidden sm:inline-flex rounded-lg border border-gray-200 bg-white p-1 text-xs font-medium">
          <span className="rounded-md px-2.5 py-1 text-gray-600">7d</span>
          <span className="rounded-md bg-gray-900 px-2.5 py-1 text-white">30d</span>
          <span className="rounded-md px-2.5 py-1 text-gray-600">90d</span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <span className="relative mt-1.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <div>
          <p className="text-sm font-semibold text-emerald-900">Automation is active</p>
          <p className="text-xs text-emerald-800">Last sync 2h ago · 18 replies sent in the last 30 days</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {kpi.value}
              {kpi.suffix ? <span className="ml-1 text-sm font-medium text-gray-400">{kpi.suffix}</span> : null}
            </p>
            <p className="mt-1 text-[11px] font-medium text-emerald-600">{kpi.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:col-span-2">
          <p className="text-sm font-semibold">New reviews</p>
          <p className="text-xs text-gray-500">Per week, last 30 days</p>
          <div className="mt-4 flex h-36 items-end gap-3">
            {weeks.map((week) => (
              <div key={week.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full max-w-[44px] flex-col justify-end" style={{ height: "112px" }}>
                  <div
                    className="w-full rounded-t bg-gray-200"
                    style={{ height: `${(week.notReplied / maxWeek) * 100}%` }}
                  />
                  <div className="w-full bg-emerald-500" style={{ height: `${(week.replied / maxWeek) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-400">{week.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Rating breakdown</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">4.5</p>
          <div className="mt-3 space-y-1.5">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-gray-600">{d.star}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${d.star >= 4 ? "bg-emerald-500" : d.star === 3 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${(d.count / maxDist) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-gray-500">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold">Latest reviews</p>
        <div className="mt-2 divide-y divide-gray-100">
          {latest.map((review) => (
            <div key={review.name} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Stars n={review.rating} />
                  <span className="text-sm font-medium">{review.name}</span>
                </div>
                <p className="truncate text-xs text-gray-500">{review.text}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    review.status === "Replied" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {review.status}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MockupShowcase() {
  return (
    <section data-testid="mockup-section" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
        <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">Your dashboard</span>
        <h2 className="font-heading mt-4 text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
          See every review and every reply, <span className="text-zinc-400">in one place.</span>
        </h2>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400">
          Know at a glance that automation is running, how your rating is trending, and which reviews are waiting for
          you.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative mt-16 mx-auto max-w-5xl"
        >
          <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-gradient-to-r from-blue-600/30 to-green-500/30 blur-3xl" />
          <div className="relative rounded-2xl border border-white/10 bg-zinc-950/60 p-2 shadow-[0_50px_150px_-30px_rgba(34,197,94,0.35)]">
            <div className="flex items-center gap-1.5 px-3 pb-2 pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="ml-3 text-xs text-zinc-500">respondly.com.au/dashboard</span>
            </div>
            <DashboardMock />
          </div>
          <p className="mt-4 text-xs text-zinc-500">The Respondly dashboard, shown with example data.</p>
        </motion.div>
      </div>
    </section>
  );
}
