import React from "react";
import Link from "next/link";

const LOGO_FULL =
"https://customer-assets.emergentagent.com/job_17dcd17d-45d3-4f6d-87e8-719aa8db2423/artifacts/vqd0isba_background_removal%23TUFIQl9wbFp5VHcjMSM2Y2FmMjhhNTNhMzRiYzBiNTFlMTQ3ZGQxNmEyZTRmMCMzNzIjI1RSQU5TRk9STUFUSU9OX1JFUVVFU1Q.png";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="relative border-t border-white/10 py-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <img src={LOGO_FULL} alt="Respondly" className="h-9 w-auto object-contain opacity-90" />
          <p className="mt-4 text-sm text-zinc-500 max-w-xs">
            Respondly auto-replies to Google reviews — with templates or AI. Built for businesses that care about every customer.
          </p>
        </div>

        <div>
          <h5 className="font-heading text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Product</h5>
          <ul className="mt-4 space-y-2 text-sm text-zinc-500">
            <li><a href="#features" className="hover:text-white transition">Features</a></li>
            <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
            <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
          </ul>
        </div>

        <div>
          <h5 className="font-heading text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Company</h5>
          <ul className="mt-4 space-y-2 text-sm text-zinc-500">
            <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
        <span>© {new Date().getFullYear()} Respondly. All rights reserved.</span>
        <span>Made with care for local businesses worldwide.</span>
      </div>
    </footer>
  );
}
