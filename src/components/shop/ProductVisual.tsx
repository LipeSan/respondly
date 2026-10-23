import type { ProductVisualKind } from "@/lib/shop";

function NfcWaves({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeWidth="2" d="M8.5 8.5a5 5 0 0 1 0 7" />
      <path strokeLinecap="round" strokeWidth="2" d="M12 5.5a9 9 0 0 1 0 13" />
      <path strokeLinecap="round" strokeWidth="2" d="M15.5 3a12.5 12.5 0 0 1 0 18" />
    </svg>
  );
}

function Stars({ className }: { className: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function MiniCard({ className = "" }: { className?: string }) {
  return (
    <div className={`flex aspect-[1.6] w-32 flex-col justify-between rounded-xl bg-gray-900 p-3 text-white shadow-lg ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wide">Respondly</span>
        <NfcWaves className="h-4 w-4 text-green-400" />
      </div>
      <div>
        <Stars className="text-amber-400" />
        <p className="mt-1 text-[10px] font-medium leading-tight">Tap to review us</p>
      </div>
    </div>
  );
}

function MiniStand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex h-32 w-24 flex-col items-center justify-center gap-2 rounded-t-xl border border-white/80 bg-white/90 shadow-lg">
        <NfcWaves className="h-6 w-6 text-green-600" />
        <Stars className="text-amber-400" />
        <p className="px-2 text-center text-[10px] font-semibold leading-tight text-gray-900">Loved your visit?</p>
        <div className="grid h-6 w-6 grid-cols-3 gap-px" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className={i % 2 === 0 ? "bg-gray-900" : "bg-gray-300"} />
          ))}
        </div>
      </div>
      <div className="h-2 w-28 rounded-b-md bg-gray-900" />
    </div>
  );
}

// Illustrated stand-ins until we have product photos. `size` picks the frame
// (list card, product page hero, gallery thumbnail) and `variant` (0–2) gives
// each gallery slide a different angle so the three slides don't look alike.
const VARIANTS = [
  { bg: "from-emerald-50 via-sky-50 to-indigo-50", transform: "" },
  { bg: "from-indigo-50 via-sky-50 to-emerald-50", transform: "-rotate-6 translate-y-2" },
  { bg: "from-sky-50 via-white to-emerald-50", transform: "scale-125 rotate-3" },
];

export function ProductVisual({
  kind,
  size = "card",
  variant = 0,
}: {
  kind: ProductVisualKind;
  size?: "card" | "large" | "thumb";
  variant?: number;
}) {
  const v = VARIANTS[variant % VARIANTS.length];
  const frame = size === "card" ? "h-44" : "h-full";
  const scale = size === "large" ? "scale-150 sm:scale-[1.75]" : size === "thumb" ? "scale-[0.35]" : "";

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${v.bg} ${frame}`}>
      {size !== "thumb" ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />
        </>
      ) : null}
      <div className={scale}>
        <div className={v.transform}>
          {kind === "card" ? <MiniCard className="-rotate-6" /> : null}
          {kind === "stand" ? <MiniStand /> : null}
          {kind === "sticker" ? (
            <div className="flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-full bg-gray-900 text-white shadow-lg">
              <NfcWaves className="h-6 w-6 text-green-400" />
              <Stars className="text-amber-400" />
              <p className="text-[10px] font-semibold">Review us</p>
            </div>
          ) : null}
          {kind === "kit" ? (
            <div className="flex scale-[0.8] items-end gap-3">
              <MiniStand />
              <div className="relative mb-4 h-24 w-36">
                <MiniCard className="absolute left-3 top-0 rotate-6 opacity-60" />
                <MiniCard className="absolute left-0 top-3 -rotate-3" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
