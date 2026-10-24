"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon, Sparkles, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";

const HERO_BG =
  "https://static.prod-images.emergentagent.com/jobs/17dcd17d-45d3-4f6d-87e8-719aa8db2423/images/4ecbf194628f52651df8101b38e3e476a0be2be45e3e4ca4aad16754f0ad3632.png";

export default function Hero() {
  return (
    <section id="top" data-testid="hero-section" className="relative pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div className="absolute inset-0">
        <Image src={HERO_BG} alt="" aria-hidden fill priority sizes="100vw" className="object-cover opacity-30" />
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
          <span
            data-testid="hero-badge"
            className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-inset ring-blue-500/30 uppercase tracking-[0.2em]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Your AI review agent for Google
          </span>

          <h1
            data-testid="hero-title"
            className="font-heading mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tighter"
          >
            Never let a Google review go{" "}
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">unanswered</span>{" "}
            again.
          </h1>

          <p data-testid="hero-subtitle" className="mt-6 max-w-xl text-lg text-zinc-300 leading-relaxed">
            Respondly is an AI agent that answers every new Google review for you. Set your rules once, and every
            evening it replies with your own templates or with AI that reads what the customer actually wrote.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/promo/trial" data-testid="hero-start">
              <Button className="!w-auto !px-8 shadow-[0_0_30px_-6px_rgba(34,197,94,0.55)]">Start 90-day free trial</Button>
            </Link>
            <a href="#pricing" className="text-sm font-semibold text-zinc-300 hover:text-white transition">
              See plans from A$9.99/mo →
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400" data-testid="hero-trial-note">
            {["90 days free", "Cancel anytime", "Approve replies first if you want"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" /> {item}
              </li>
            ))}
          </ul>
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

type Plan = "starter" | "pro";

// Example reviews and replies for the interactive preview. Starter replies are
// what a per-rating template produces; Pro replies show the kind of reply the
// AI writes from the review itself.
const EXAMPLES: Record<number, { name: string; review: string; starter: string; pro: string }> = {
  5: {
    name: "Chloe W.",
    review: "Best banana bread in the area and the staff remembered my order. Love this place!",
    starter: "Thanks so much, Chloe! We're thrilled you enjoyed your visit. See you again soon.",
    pro: "Thank you, Chloe! We're so glad the banana bread hit the spot, and the team loves seeing regulars. Your usual will be ready next time.",
  },
  4: {
    name: "Daniel K.",
    review: "Great coffee, a bit pricey for a large. Will be back though.",
    starter: "Thank you for the kind words, Daniel. We're glad you had a good time, and we'd love to make your next visit a five-star one.",
    pro: "Thanks, Daniel! Really glad you enjoyed the coffee, and thanks for the honest note on the price of a large. We'll pass it on to the team. See you next time!",
  },
  3: {
    name: "Ava L.",
    review: "Food was fine but the music was so loud we couldn't talk.",
    starter: "Thanks for the honest feedback, Ava. We'd like to hear what would have made your visit better. Please give us a call.",
    pro: "Thanks for letting us know, Ava, and sorry the music made it hard to chat. We've passed this on to the team and hope you'll give us another go.",
  },
  2: {
    name: "Marina S.",
    review: "Coffee was great but I waited 15 minutes for it. Staff seemed busy.",
    starter: "We're sorry, Marina. That isn't the experience we want anyone to have. Please call us so we can put it right.",
    pro: "Hi Marina, thank you for being honest, and we're sorry about the wait. Glad the coffee made up for it a little. Please ask for the manager next time so we can make it right.",
  },
  1: {
    name: "Josh P.",
    review: "Ordered online, half the order was missing and nobody answered the phone.",
    starter: "We're really sorry, Josh. That isn't the experience we want anyone to have. Please call us so we can put it right.",
    pro: "Josh, we're really sorry. A missing order and no answer on the phone isn't good enough. Please get in touch with your order details so we can sort it out straight away.",
  },
};

function Stars({ n, size = "h-3 w-3" }: { n: number; size?: string }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= n ? "text-yellow-400 fill-yellow-400" : "text-zinc-600"}`} />
      ))}
    </div>
  );
}

function ReviewSimulator() {
  const [rating, setRating] = useState(2);
  const [plan, setPlan] = useState<Plan>("pro");
  const example = EXAMPLES[rating];
  const reply = plan === "pro" ? example.pro : example.starter;

  return (
    <div data-testid="hero-review-card" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Try it</span>
        <div className="inline-flex rounded-full bg-black/60 p-0.5 ring-1 ring-white/10" role="group" aria-label="Plan">
          {(["starter", "pro"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={plan === p}
              onClick={() => setPlan(p)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                plan === p ? (p === "pro" ? "bg-green-500 text-black" : "bg-white text-black") : "text-zinc-400 hover:text-white"
              }`}
            >
              {p === "pro" ? "Pro · AI" : "Starter · Template"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2" role="group" aria-label="Review rating">
        <span className="text-xs text-zinc-400">Pick a rating:</span>
        {[5, 4, 3, 2, 1].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={rating === n}
            onClick={() => setRating(n)}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
              rating === n ? "bg-yellow-400 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            {n}
            <Star className={`h-3 w-3 ${rating === n ? "fill-black" : "fill-yellow-400 text-yellow-400"}`} />
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${rating}-${plan}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="space-y-3"
        >
          <div className="rounded-xl bg-black/60 border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                {example.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold">{example.name}</p>
                <Stars n={rating} />
              </div>
            </div>
            <p className="text-sm text-zinc-300">{example.review}</p>
          </div>

          <div className="flex items-center justify-center text-xs text-zinc-400 gap-2">
            <span className="h-px w-8 bg-zinc-800" />
            <Moon className="h-3.5 w-3.5" /> Posted to Google this evening
            <span className="h-px w-8 bg-zinc-800" />
          </div>

          <div
            className={`rounded-xl p-4 border ${
              plan === "pro"
                ? "bg-gradient-to-br from-blue-600/15 to-green-500/10 border-blue-500/30"
                : "bg-white/[0.03] border-white/15"
            }`}
          >
            <p className={`text-xs mb-2 font-semibold ${plan === "pro" ? "text-blue-300" : "text-zinc-300"}`}>
              {plan === "pro" ? "Respondly Pro · written by AI from this review" : "Respondly Starter · your template for " + rating + "★"}
            </p>
            <p className="text-sm text-white leading-relaxed">{reply}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-[11px] text-zinc-500">Example reviews and replies.</p>
    </div>
  );
}
