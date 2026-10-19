"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { Text } from "@/components/Text";
import { formatDate } from "@/lib/date";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

type RangeDays = 7 | 30 | 90;
type Comparison = { current: number | null; previous: number | null };

type ReviewListItem = {
  id: string;
  rating: number;
  authorName: string | null;
  comment: string | null;
  createdAt: string;
  status?: "pending" | "responded" | "failed" | "skipped";
  beforeAutomation?: boolean;
};

type DashboardMetrics = {
  business: { id: string; name: string };
  rangeDays: RangeDays;
  automation: {
    enabled: boolean;
    googleConnected: boolean;
    locationSelected: boolean;
    connectedAt: string | null;
    billing: "ok" | "billing_blocked" | "subscription_inactive";
    lastSync: { status: "success" | "failed"; at: string } | null;
  };
  kpis: {
    averageRating: Comparison;
    reviewsReceived: Comparison;
    repliesSent: Comparison;
    avgResponseMinutes: Comparison;
  };
  series: Array<{ start: string; replied: number; notReplied: number }>;
  bucket: "day" | "week";
  ratings: { distribution: Record<"1" | "2" | "3" | "4" | "5", number>; total: number; average: number | null };
  attention: {
    draftsCount: number;
    drafts: ReviewListItem[];
    lowRatingCount: number;
    lowRating: ReviewListItem[];
    failedCount: number;
  };
  recentReviews: ReviewListItem[];
};

const rangeOptions: RangeDays[] = [7, 30, 90];

const chartColors = {
  replied: "#10B981",
  notReplied: "#E5E7EB",
};

function formatMinutes(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  const minutes = Math.round(v);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatRelative(iso: string) {
  const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

function Stars({ n, size = "h-3.5 w-3.5" }: { n: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`${size} ${i <= n ? "text-yellow-400" : "text-gray-200"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// ---- Automation status -----------------------------------------------------

function getAutomationStatus(metrics: DashboardMetrics) {
  const { automation, kpis, rangeDays } = metrics;
  if (!automation.googleConnected) {
    return {
      tone: "error" as const,
      title: "Google isn't connected",
      detail: "Connect your Google Business Profile so Respondly can sync and reply to reviews.",
      action: { label: "Connect Google", href: "/google" },
    };
  }
  if (!automation.locationSelected) {
    return {
      tone: "warning" as const,
      title: "Choose your business location",
      detail: "Pick which Google location Respondly should manage.",
      action: { label: "Choose location", href: "/google" },
    };
  }
  if (automation.billing !== "ok") {
    return {
      tone: "warning" as const,
      title: "Automatic replies are paused",
      detail:
        automation.billing === "billing_blocked"
          ? "There's a problem with your last payment."
          : "You don't have an active plan.",
      action: { label: "Manage plan", href: "/subscription" },
    };
  }
  if (!automation.enabled) {
    return {
      tone: "warning" as const,
      title: "Automatic replies are turned off",
      detail: "New reviews are synced but won't be answered until you turn auto-replies on.",
      action: { label: "Turn on", href: "/configuration" },
    };
  }
  if (automation.lastSync?.status === "failed") {
    return {
      tone: "warning" as const,
      title: "The last review sync failed",
      detail: `Last attempt ${formatRelative(automation.lastSync.at)}. We'll retry automatically; reconnecting Google usually fixes it.`,
      action: { label: "Check Google", href: "/google" },
    };
  }

  const sent = kpis.repliesSent.current ?? 0;
  const parts = [
    automation.lastSync ? `Last sync ${formatRelative(automation.lastSync.at)}` : "Waiting for the first sync",
    `${sent} ${sent === 1 ? "reply" : "replies"} sent in the last ${rangeDays} days`,
  ];
  return { tone: "success" as const, title: "Automation is active", detail: parts.join(" · "), action: null };
}

const statusToneClasses = {
  success: { box: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500", title: "text-emerald-900", detail: "text-emerald-800" },
  warning: { box: "border-amber-200 bg-amber-50", dot: "bg-amber-500", title: "text-amber-900", detail: "text-amber-800" },
  error: { box: "border-red-200 bg-red-50", dot: "bg-red-500", title: "text-red-900", detail: "text-red-800" },
};

function AutomationStatusBanner({ metrics }: { metrics: DashboardMetrics }) {
  const status = getAutomationStatus(metrics);
  const tone = statusToneClasses[status.tone];
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${tone.box}`}>
      <div className="flex items-start gap-3">
        <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
          {status.tone === "success" ? (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden ${tone.dot}`} />
          ) : null}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone.dot}`} />
        </span>
        <div>
          <p className={`text-sm font-semibold ${tone.title}`}>{status.title}</p>
          <p className={`mt-0.5 text-sm ${tone.detail}`}>{status.detail}</p>
        </div>
      </div>
      {status.action ? (
        <Link
          href={status.action.href}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          {status.action.label}
        </Link>
      ) : null}
    </div>
  );
}

// ---- Needs attention --------------------------------------------------------

function ReviewRow({ review, badge }: { review: ReviewListItem; badge?: ReactNode }) {
  return (
    <Link
      href={`/reviews?open=${encodeURIComponent(review.id)}`}
      className="group flex items-start justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Stars n={review.rating} />
          <span className="text-sm font-medium text-gray-900">{review.authorName || "Anonymous"}</span>
          <span className="text-xs text-gray-400">{formatShortDate(review.createdAt)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{review.comment || "No comment, rating only."}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <svg
          className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </div>
    </Link>
  );
}

function NeedsAttention({ attention }: { attention: DashboardMetrics["attention"] }) {
  const total = attention.draftsCount + attention.lowRatingCount + attention.failedCount;
  if (total === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Needs your attention"
        subtitle="Reviews waiting on you before they can be answered."
        action={
          <Link href="/reviews?status=pending" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
            Open reviews
          </Link>
        }
      />
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {attention.draftsCount > 0 ? (
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Drafts to approve · {attention.draftsCount}
            </p>
            <div className="mt-1">
              {attention.drafts.map((r) => (
                <ReviewRow
                  key={r.id}
                  review={r}
                  badge={<span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Draft</span>}
                />
              ))}
            </div>
          </div>
        ) : null}
        {attention.lowRatingCount > 0 ? (
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Low ratings without a reply · {attention.lowRatingCount}
            </p>
            <div className="mt-1">
              {attention.lowRating.map((r) => (
                <ReviewRow
                  key={r.id}
                  review={r}
                  badge={
                    r.status === "failed" ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Failed</span>
                    ) : null
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {attention.failedCount > 0 && attention.lowRatingCount === 0 ? (
        <p className="mt-4 px-3 text-sm text-red-700">
          {attention.failedCount} {attention.failedCount === 1 ? "reply" : "replies"} failed to publish.{" "}
          <Link href="/reviews?status=failed" className="font-semibold underline underline-offset-2">
            Review failures
          </Link>
        </p>
      ) : null}
    </Card>
  );
}

// ---- KPIs ----------------------------------------------------------------

function Delta({
  comparison,
  higherIsBetter,
  format,
}: {
  comparison: Comparison;
  higherIsBetter: boolean;
  format: (v: number) => string;
}) {
  const { current, previous } = comparison;
  if (current === null || previous === null || previous === 0) {
    return <span className="text-xs text-gray-400">No data for the previous period</span>;
  }
  const diff = current - previous;
  if (Math.abs(diff) < 1e-9) return <span className="text-xs text-gray-500">Same as previous period</span>;
  const good = higherIsBetter ? diff > 0 : diff < 0;
  return (
    <span className={`text-xs font-medium ${good ? "text-emerald-600" : "text-red-600"}`}>
      {diff > 0 ? "▲" : "▼"} {format(Math.abs(diff))} <span className="font-normal text-gray-500">vs previous period</span>
    </span>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  delta,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta: ReactNode;
}) {
  return (
    <Card className="!p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
        {value}
        {suffix ? <span className="ml-1 text-base font-medium text-gray-400">{suffix}</span> : null}
      </p>
      <div className="mt-2">{delta}</div>
    </Card>
  );
}

// ---- Charts ----------------------------------------------------------------

function ReviewsChart({ series, bucket }: { series: DashboardMetrics["series"]; bucket: DashboardMetrics["bucket"] }) {
  const hasData = series.some((s) => s.replied + s.notReplied > 0);
  const data = series.map((s) => ({ ...s, label: formatShortDate(s.start) }));

  return (
    <div className="mt-5">
      {hasData ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#F9FAFB" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-gray-900">
                        {bucket === "week" ? `Week of ${label}` : label}
                      </p>
                      {payload.map((p) => (
                        <p key={String(p.dataKey)} className="mt-1 flex items-center justify-between gap-6 text-gray-600">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                            {p.name}
                          </span>
                          <span className="font-semibold text-gray-900">{p.value}</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="replied" name="Replied" stackId="reviews" fill={chartColors.replied} />
              <Bar dataKey="notReplied" name="Not replied" stackId="reviews" fill={chartColors.notReplied} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 text-center">
          <p className="text-sm font-medium text-gray-700">No new reviews in this period</p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">
            New Google reviews will show up here as soon as they&apos;re synced.
          </p>
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: chartColors.replied }} /> Replied
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: chartColors.notReplied }} /> Not replied
        </span>
      </div>
    </div>
  );
}

function RatingBreakdown({ ratings }: { ratings: DashboardMetrics["ratings"] }) {
  const max = Math.max(1, ...Object.values(ratings.distribution));
  return (
    <div className="mt-5">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-gray-900 tabular-nums">
          {ratings.average === null ? "—" : ratings.average.toFixed(1)}
        </span>
        <Stars n={Math.round(ratings.average ?? 0)} size="h-4 w-4" />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {ratings.total} {ratings.total === 1 ? "review" : "reviews"} on Google
      </p>
      <div className="mt-5 space-y-2">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = ratings.distribution[String(star) as keyof typeof ratings.distribution] ?? 0;
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className="w-6 shrink-0 text-gray-600 tabular-nums">{star}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${star >= 4 ? "bg-emerald-500" : star === 3 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-gray-500 tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Recent reviews -------------------------------------------------------

function RecentStatusBadge({ review }: { review: ReviewListItem }) {
  if (review.beforeAutomation) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Not automated</span>;
  }
  const styles: Record<NonNullable<ReviewListItem["status"]>, [string, string]> = {
    responded: ["Replied", "bg-emerald-100 text-emerald-800"],
    pending: ["Pending", "bg-yellow-100 text-yellow-800"],
    failed: ["Failed", "bg-red-100 text-red-800"],
    skipped: ["Skipped", "bg-gray-100 text-gray-700"],
  };
  const [label, classes] = styles[review.status ?? "pending"];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>{label}</span>;
}

// ---- Page ------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-16 rounded-2xl bg-gray-100" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 rounded-2xl bg-gray-100 lg:col-span-2" />
        <div className="h-80 rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noBusiness, setNoBusiness] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const load = useCallback(
    async (range: RangeDays) => {
      setRefreshing(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard/metrics?range=${range}`, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          router.refresh();
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 && data?.code === "NO_BUSINESS") {
          setNoBusiness(true);
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Failed to load dashboard");
        setMetrics(data as DashboardMetrics);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void load(rangeDays);
  }, [load, rangeDays]);

  if (noBusiness) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <Text variant="h2">Let&apos;s set up your business</Text>
          <p className="mt-2 text-sm text-gray-500">
            Add your business details to start syncing and replying to Google reviews.
          </p>
          <Button className="mt-6" onClick={() => router.push("/onboarding")}>
            Start setup
          </Button>
        </Card>
      </div>
    );
  }

  const kpis = metrics?.kpis;

  return (
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Text variant="h1">Dashboard</Text>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">{metrics?.business.name ?? " "}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label="Date range">
              {rangeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={rangeDays === option}
                  onClick={() => setRangeDays(option)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    rangeDays === option ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {option}d
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => load(rangeDays)}
              disabled={refreshing}
              aria-label="Refresh"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-800">Couldn&apos;t load the dashboard: {error}</p>
            <Button variant="outline" className="!w-auto bg-white px-4 py-2" onClick={() => load(rangeDays)}>
              Try again
            </Button>
          </div>
        ) : null}

        {loading && !metrics ? (
          <DashboardSkeleton />
        ) : metrics && kpis ? (
          <div className={`space-y-6 transition-opacity ${refreshing ? "opacity-60" : ""}`}>
            <AutomationStatusBanner metrics={metrics} />

            <NeedsAttention attention={metrics.attention} />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label="Average rating"
                value={kpis.averageRating.current === null ? "—" : kpis.averageRating.current.toFixed(1)}
                suffix={kpis.averageRating.current === null ? undefined : "/ 5"}
                delta={<Delta comparison={kpis.averageRating} higherIsBetter format={(v) => v.toFixed(1)} />}
              />
              <KpiCard
                label="New reviews"
                value={String(kpis.reviewsReceived.current ?? 0)}
                delta={<Delta comparison={kpis.reviewsReceived} higherIsBetter format={(v) => String(v)} />}
              />
              <KpiCard
                label="Replies sent"
                value={String(kpis.repliesSent.current ?? 0)}
                delta={<Delta comparison={kpis.repliesSent} higherIsBetter format={(v) => String(v)} />}
              />
              <KpiCard
                label="Avg. reply time"
                value={formatMinutes(kpis.avgResponseMinutes.current)}
                delta={<Delta comparison={kpis.avgResponseMinutes} higherIsBetter={false} format={formatMinutes} />}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  title="New reviews"
                  subtitle={`${metrics.bucket === "week" ? "Per week" : "Per day"}, last ${metrics.rangeDays} days`}
                />
                <ReviewsChart series={metrics.series} bucket={metrics.bucket} />
              </Card>
              <Card>
                <CardHeader title="Rating breakdown" subtitle="All time" />
                <RatingBreakdown ratings={metrics.ratings} />
              </Card>
            </div>

            <Card>
              <CardHeader
                title="Latest reviews"
                action={
                  <Link href="/reviews" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                    View all
                  </Link>
                }
              />
              <div className="mt-3 divide-y divide-gray-100">
                {metrics.recentReviews.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    No reviews yet. They&apos;ll appear here after the first sync.
                  </p>
                ) : (
                  metrics.recentReviews.map((r) => (
                    <ReviewRow key={r.id} review={r} badge={<RecentStatusBadge review={r} />} />
                  ))
                )}
              </div>
              {metrics.automation.connectedAt ? (
                <p className="mt-3 px-3 text-xs text-gray-400">
                  Automatic replies apply to reviews posted since {formatDate(metrics.automation.connectedAt)}.
                </p>
              ) : null}
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
