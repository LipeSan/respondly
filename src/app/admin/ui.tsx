import type { ReactNode } from "react";

// Shared building blocks for the admin area, matching the customer dashboard.

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-800">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type HealthLevel = "healthy" | "warning" | "critical";

const healthDotClasses: Record<HealthLevel, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

export function HealthDot({ level, title }: { level: HealthLevel; title?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${healthDotClasses[level]}`}
      title={title}
      aria-label={title ?? level}
    />
  );
}

const badgeTones = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-emerald-100 text-emerald-800",
  blue: "bg-blue-100 text-blue-800",
  violet: "bg-violet-100 text-violet-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function planBadge(plan: string | null | undefined, status: string | null | undefined): { label: string; tone: BadgeTone } {
  if (!plan || !status) return { label: "No plan", tone: "gray" };
  const name = plan === "pro" ? "Pro" : plan === "starter" ? "Starter" : plan;
  if (status === "trialing") return { label: `${name} · trial`, tone: "blue" };
  if (status === "active") return { label: name, tone: plan === "pro" ? "violet" : "green" };
  if (status === "past_due") return { label: `${name} · past due`, tone: "red" };
  if (status === "canceled") return { label: `${name} · canceled`, tone: "gray" };
  return { label: `${name} · ${status}`, tone: "amber" };
}

export function formatRelative(value: Date | string | null | undefined, fallback = "never") {
  if (!value) return fallback;
  const diffMinutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatMoney(amountInCents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: 0 }).format(
      amountInCents / 100
    );
  } catch {
    return `${(amountInCents / 100).toFixed(0)} ${currency}`;
  }
}

export function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    impersonation_started: "Opened customer account",
    impersonation_stopped: "Closed customer account",
    user_role_updated: "Changed user role",
    user_email_sent: "Sent email",
    auto_responder_enabled: "Turned auto-replies on",
    auto_responder_disabled: "Turned auto-replies off",
    shop_order_shipped: "Marked Shop order shipped",
    shop_order_unshipped: "Undid Shop order shipped",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}
