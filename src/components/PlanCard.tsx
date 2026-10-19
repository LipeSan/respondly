import type { ReactNode } from "react";

// Plan card keeps the soft gradient + glow from the original design: green
// when the subscription is active, blue while there's no plan yet.
export function PlanCard({
  active,
  className = "",
  children,
}: {
  active: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r p-6 shadow-sm ${className} ${
        active ? "border-emerald-200 from-emerald-50 via-sky-50 to-indigo-50" : "border-indigo-100 from-indigo-50 via-sky-50 to-white"
      }`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${active ? "bg-emerald-200/40" : "bg-indigo-200/40"}`}
      />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
