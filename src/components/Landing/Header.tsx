"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/Button";

const LOGO_FULL =
  "https://customer-assets.emergentagent.com/job_17dcd17d-45d3-4f6d-87e8-719aa8db2423/artifacts/vqd0isba_background_removal%23TUFIQl9wbFp5VHcjMSM2Y2FmMjhhNTNhMzRiYzBiNTFlMTQ3ZGQxNmEyZTRmMCMzNzIjI1RSQU5TRk9STUFUSU9OX1JFUVVFU1Q.png";

type HeaderProps = {
  showNav?: boolean;
};

export default function Header({ showNav = true }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.header
      data-testid="site-header"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 inset-x-0 z-50 transition-all ${
        scrolled ? "bg-black/70 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#top" data-testid="header-logo-link" className="flex items-center gap-2">
          <img
            src={LOGO_FULL}
            alt="Respondly"
            className="h-9 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 24px rgba(37,99,235,0.35))" }}
          />
        </a>

        {showNav ? (
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <button onClick={() => scrollToId("how")} data-testid="nav-how" className="hover:text-white transition">
              How it works
            </button>
            <button onClick={() => scrollToId("features")} data-testid="nav-features" className="hover:text-white transition">
              Features
            </button>
            <button onClick={() => scrollToId("pricing")} data-testid="nav-pricing" className="hover:text-white transition">
              Pricing
            </button>
            <button onClick={() => scrollToId("faq")} data-testid="nav-faq" className="hover:text-white transition">
              FAQ
            </button>
          </nav>
        ) : null}

        <div className="flex items-center gap-3">
          <Link href="/login" data-testid="header-login-btn">
            <Button variant="ghost" className="!w-auto !py-2 !text-white hover:!bg-white/10">
              Log in
            </Button>
          </Link>
          <Link href="/register?next=/start-trial" data-testid="header-cta-btn">
            <Button className="!w-auto !py-2 shadow-[0_0_24px_-6px_rgba(34,197,94,0.6)]">Start free trial</Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
