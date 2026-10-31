"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Fast navigations finish before this, so the overlay doesn't flash.
const SHOW_DELAY_MS = 150;
// Never leave the page covered if a navigation is abandoned.
const MAX_PENDING_MS = 15_000;

/**
 * Translucent layer over a `relative` parent: what's behind stays visible,
 * blurred, with a spinner on top. Also usable on its own for in-page loads.
 */
export function LoadingOverlay({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-30 rounded-2xl bg-white/40 backdrop-blur-[1px]"
    >
      <div className="sticky top-1/3 flex justify-center pt-24">
        <div className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg ring-1 ring-gray-900/5">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 motion-reduce:animate-none" />
          {label}…
        </div>
      </div>
    </div>
  );
}

// Fires on every committed route change, including query-only ones.
function RouteChangeListener({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(onChange, [pathname, search, onChange]);
  return null;
}

// Runs in the capture phase, before next/link calls preventDefault().
function isInternalNavigation(event: MouseEvent) {
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = (event.target as Element | null)?.closest?.("a");
  if (!anchor || !anchor.href || anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const url = new URL(anchor.href, window.location.href);
  const here = new URL(window.location.href);
  if (url.origin !== here.origin) return false;
  // Same page (or just a #hash): nothing will load.
  return url.pathname !== here.pathname || url.search !== here.search;
}

/**
 * Wraps a page area and covers it with LoadingOverlay while a link
 * navigation is in flight, keeping the current page visible underneath.
 */
export function NavigationLoadingArea({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const done = useCallback(() => {
    setPending(false);
    setVisible(false);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isInternalNavigation(event)) setPending(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const show = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    const giveUp = setTimeout(done, MAX_PENDING_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(giveUp);
    };
  }, [pending, done]);

  return (
    <div className="relative">
      {children}
      <Suspense fallback={null}>
        <RouteChangeListener onChange={done} />
      </Suspense>
      {pending && visible ? <LoadingOverlay /> : null}
    </div>
  );
}
