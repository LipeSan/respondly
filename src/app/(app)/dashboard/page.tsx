"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { Text } from "@/components/Text";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Label,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ReviewStatus = "pending" | "responded" | "failed" | "skipped";
type ResponseMethod = "template" | "ai" | "manual";

type DashboardMetrics = {
  business: { id: string; name: string; createdAt: string };
  subscription: {
    plan: string;
    status: string;
    createdAt: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    cancelAt: string | null;
  } | null;
  rangeDays: number;
  totals: {
    totalReviews: number;
    averageRating: number;
    responseRate: number;
    avgResponseTimeMinutes: number | null;
    status: Record<ReviewStatus, number>;
    methods: Record<ResponseMethod, number>;
    draftsAwaitingApproval: number;
    pendingWithoutDraft: number;
  };
  series: Array<{
    day: string;
    total: number;
    avgRating: number | null;
    status: Record<ReviewStatus, number>;
    drafted: number;
  }>;
  lowRatingOpen: Array<{
    id: string;
    rating: number;
    authorName: string | null;
    comment: string | null;
    status: ReviewStatus;
    createdAt: string;
  }>;
  draftsAwaitingApproval: Array<{
    id: string;
    rating: number;
    authorName: string | null;
    comment: string | null;
    createdAt: string;
    method: ResponseMethod;
    draftCreatedAt: string;
  }>;
};

function formatPercent(v: number) {
  if (!Number.isFinite(v)) return "—";
  return `${Math.round(v * 100)}%`;
}

function formatRating(v: number) {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(1);
}

function formatMinutes(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  const minutes = Math.round(v);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDayLabel(isoDay: string) {
  const d = new Date(`${isoDay}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      {label && (
        <div className="text-xs font-semibold text-gray-900">
          {formatDayLabel(label)}
        </div>
      )}
      <div className="mt-1 space-y-1">
        {payload
          .filter((p) => typeof p.value === "number")
          .map((p, idx) => (
            <div key={idx} className="flex items-center justify-between gap-6 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="h-2 w-2 rounded-sm" style={{ background: p.color ?? "#9CA3AF" }} />
                <span>{p.name}</span>
              </div>
              <span className="font-semibold text-gray-900">{p.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-600">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function ReviewsLineChart({ data }: { data: Array<{ day: string; total: number }> }) {
  return (
    <div className="w-full">
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="day"
            tickFormatter={formatDayLabel}
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          >
            <Label value="Date" position="insideBottom" offset={-2} fill="#6B7280" fontSize={12} />
          </XAxis>
          <YAxis
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          >
            <Label value="Reviews" angle={-90} position="insideLeft" fill="#6B7280" fontSize={12} />
          </YAxis>
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="total"
            name="Reviews"
            stroke="#2563EB"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: "Reviews", color: "#2563EB" }]} />
    </div>
  );
}

function StatusStackedBarChart({
  data,
}: {
  data: Array<{ day: string; responded: number; pending: number; failed: number; skipped: number }>;
}) {
  return (
    <div className="w-full">
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="day"
            tickFormatter={formatDayLabel}
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          >
            <Label value="Date" position="insideBottom" offset={-2} fill="#6B7280" fontSize={12} />
          </XAxis>
          <YAxis
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          >
            <Label value="Count" angle={-90} position="insideLeft" fill="#6B7280" fontSize={12} />
          </YAxis>
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="responded" name="Responded" stackId="a" fill="#10B981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="pending" name="Pending" stackId="a" fill="#F59E0B" />
          <Bar dataKey="failed" name="Failed" stackId="a" fill="#EF4444" />
          <Bar dataKey="skipped" name="Skipped" stackId="a" fill="#9CA3AF" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { label: "Responded", color: "#10B981" },
          { label: "Pending", color: "#F59E0B" },
          { label: "Failed", color: "#EF4444" },
          { label: "Skipped", color: "#9CA3AF" },
        ]}
      />
    </div>
  );
}

function MethodDonutChart({
  methods,
}: {
  methods: Record<ResponseMethod, number>;
}) {
  const total = methods.ai + methods.template + methods.manual;
  const data = [
    { name: "AI", value: methods.ai, color: "#2563EB" },
    { name: "Template", value: methods.template, color: "#10B981" },
    { name: "Manual", value: methods.manual, color: "#9CA3AF" },
  ].filter((d) => d.value > 0);

  return (
    <div className="w-full">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0] as unknown as { name?: string; value?: number; payload?: { color?: string } };
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
                  <div className="flex items-center justify-between gap-6 text-xs">
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="h-2 w-2 rounded-sm" style={{ background: p.payload?.color ?? "#9CA3AF" }} />
                      <span>{p.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{p.value}</span>
                  </div>
                </div>
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="#111827" fontSize={14} fontWeight={700}>
            {total}
          </text>
          <text x="50%" y="62%" textAnchor="middle" dominantBaseline="central" fill="#6B7280" fontSize={11}>
            Replies
          </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={data.map((d) => ({ label: d.name, color: d.color }))} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const lineData = useMemo(() => {
    return (metrics?.series ?? []).map((s) => ({ day: s.day, total: s.total }));
  }, [metrics]);

  const statusData = useMemo(() => {
    return (metrics?.series ?? []).map((s) => ({
      day: s.day,
      responded: s.status.responded,
      pending: s.status.pending,
      failed: s.status.failed,
      skipped: s.status.skipped,
    }));
  }, [metrics]);

  const customerSince = useMemo(() => {
    if (!metrics) return "—";
    const iso = metrics.subscription?.createdAt ?? metrics.business.createdAt;
    return new Date(iso).toLocaleDateString();
  }, [metrics]);

  async function load(nextRange: 7 | 30 | 90, opts?: { silent?: boolean }) {
    const silent = Boolean(opts?.silent);
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const res = await fetch(`/api/dashboard/metrics?range=${nextRange}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/login");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && (data?.code === "NO_BUSINESS" || data?.error === "No business")) {
        setMetrics(null);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to load dashboard metrics");
      setMetrics(data as DashboardMetrics);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
      setMetrics(null);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    load(rangeDays);
  }, []);

  useEffect(() => {
    if (metrics && metrics.rangeDays !== rangeDays) {
      load(rangeDays, { silent: true });
    }
  }, [rangeDays, metrics]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <Text variant="body" className="font-medium">
            Loading dashboard...
          </Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <Text variant="subtitle" className="mb-2 font-bold text-gray-900">
            Error loading
          </Text>
          <Text variant="body" className="mb-6">
            {error}
          </Text>
          <Button onClick={() => load(rangeDays)}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!metrics?.business?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <Text variant="h2" className="mb-2">
            No business yet
          </Text>
          <Text variant="body" className="mb-8">
            You need to create a business before accessing the dashboard.
          </Text>
          <Button onClick={() => router.push("/onboarding")}>Go to Onboarding</Button>
        </div>
      </div>
    );
  }

  const totals = metrics.totals;
  const subscription = metrics.subscription;
  const statusRaw = subscription?.status ?? "none";
  const isCancelScheduled = Boolean(subscription?.cancelAtPeriodEnd && statusRaw !== "canceled");

  let statusLabel = "No active subscription";
  let badgeClasses = "bg-gray-100 border-gray-200 text-gray-700";
  let dotClasses = "bg-gray-400";

  if (statusRaw === "active") {
    statusLabel = "Active";
    badgeClasses = "bg-emerald-100 border-emerald-200 text-emerald-800";
    dotClasses = "bg-emerald-500";
  } else if (statusRaw === "trialing") {
    statusLabel = "Trialing";
    badgeClasses = "bg-emerald-100 border-emerald-200 text-emerald-800";
    dotClasses = "bg-emerald-500";
  } else if (statusRaw === "past_due") {
    statusLabel = "Past due";
    badgeClasses = "bg-amber-100 border-amber-200 text-amber-800";
    dotClasses = "bg-amber-500";
  } else if (statusRaw === "incomplete" || statusRaw === "incomplete_expired") {
    statusLabel = "Incomplete";
    badgeClasses = "bg-yellow-100 border-yellow-200 text-yellow-800";
    dotClasses = "bg-yellow-500";
  } else if (statusRaw === "canceled") {
    statusLabel = "Canceled";
    badgeClasses = "bg-red-100 border-red-200 text-red-800";
    dotClasses = "bg-red-500";
  }

  if (isCancelScheduled) {
    statusLabel = "Cancel scheduled";
    badgeClasses = "bg-amber-100 border-amber-200 text-amber-800";
    dotClasses = "bg-amber-500";
  }

  return (
    <div className="pb-12">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Text variant="h1">Dashboard</Text>
            <Text variant="subtitle" className="mt-2">
              {metrics.business.name}
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select
                label="Range"
                value={String(rangeDays)}
                onChange={(e) => setRangeDays((Number(e.target.value) as 7 | 30 | 90) || 30)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </Select>
            </div>
            <Button variant="outline" className="!w-auto" onClick={() => load(rangeDays, { silent: true })}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="body" className="text-sm font-medium text-gray-500 mb-1">
              Total reviews
            </Text>
            <Text variant="h2" className="text-3xl font-bold text-gray-900">
              {totals.totalReviews}
            </Text>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="body" className="text-sm font-medium text-gray-500 mb-1">
              Customer since
            </Text>
            <Text variant="h2" className="text-3xl font-bold text-gray-900">
              {customerSince}
            </Text>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 shadow-xl p-6">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl" />
            <div className="absolute -left-4 -bottom-8 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <Text variant="body" className="text-sm font-medium text-gray-600">
                  Current plan
                </Text>
              </div>

              <Text variant="h2" className="mt-2 text-3xl font-bold text-gray-900">
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>
                    {subscription?.plan === "pro"
                      ? "Pro"
                      : subscription?.plan === "starter"
                        ? "Starter"
                        : subscription?.plan ?? "Free"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold border ${badgeClasses}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${dotClasses}`} />
                    <span>{statusLabel}</span>
                  </span>
                </span>
              </Text>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="body" className="text-sm font-medium text-gray-500 mb-1">
              Average rating
            </Text>
            <div className="flex items-end justify-between gap-3">
              <Text variant="h2" className="text-3xl font-bold text-gray-900">
                {formatRating(totals.averageRating)}
              </Text>
              <Text variant="body" className="text-sm text-gray-500">
                / 5
              </Text>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="body" className="text-sm font-medium text-gray-500 mb-1">
              Published rate
            </Text>
            <div className="flex items-end justify-between">
              <Text variant="h2" className="text-3xl font-bold text-gray-900">
                {formatPercent(totals.responseRate)}
              </Text>
              <Text variant="body" className="text-sm text-gray-500">
                {totals.status.responded}/{totals.totalReviews}
              </Text>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="body" className="text-sm font-medium text-gray-500 mb-1">
              Avg response time
            </Text>
            <Text variant="h2" className="text-3xl font-bold text-gray-900">
              {formatMinutes(totals.avgResponseTimeMinutes)}
            </Text>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="body" className="text-sm font-medium text-gray-500 mb-1">
              Awaiting approval
            </Text>
            <div className="flex items-end justify-between gap-3">
              <Text variant="h2" className="text-3xl font-bold text-blue-600">
                {totals.draftsAwaitingApproval}
              </Text>
              <Text variant="body" className="text-xs text-gray-500">
                Draft replies
              </Text>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="body" className="text-sm font-medium text-gray-500 mb-1">
              Pending
            </Text>
            <div className="flex items-end justify-between gap-3">
              <Text variant="h2" className="text-3xl font-bold text-amber-600">
                {totals.pendingWithoutDraft}
              </Text>
              <Text variant="body" className="text-xs text-gray-500">
                Without draft
              </Text>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="body" className="text-sm font-medium text-gray-500 mb-1">
              Failures
            </Text>
            <Text variant="h2" className="text-3xl font-bold text-red-600">
              {totals.status.failed}
            </Text>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Text variant="subtitle" className="font-bold text-gray-900">
                  Reviews over time
                </Text>
                <Text variant="body" className="mt-1 text-sm text-gray-600">
                  Total reviews per day
                </Text>
              </div>
              <Text variant="body" className="text-sm text-gray-500">
                {metrics.rangeDays}d
              </Text>
            </div>
            <div className="mt-4">
              <ReviewsLineChart data={lineData} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="subtitle" className="font-bold text-gray-900">
              Response method
            </Text>
            <Text variant="body" className="mt-1 text-sm text-gray-600">
              AI vs Template vs Manual
            </Text>
            <div className="mt-5">
              <MethodDonutChart methods={totals.methods} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Text variant="subtitle" className="font-bold text-gray-900">
                  Review status
                </Text>
                <Text variant="body" className="mt-1 text-sm text-gray-600">
                  Responded vs pending vs failed vs skipped
                </Text>
              </div>
            </div>
            <div className="mt-5">
              <StatusStackedBarChart data={statusData} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div>
              <Text variant="subtitle" className="font-bold text-gray-900">
                Awaiting approval
              </Text>
              <Text variant="body" className="mt-1 text-sm text-gray-600">
                Draft replies ready to publish
              </Text>
            </div>

            <div className="mt-4 space-y-3">
              {metrics.draftsAwaitingApproval.length === 0 ? (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <Text variant="body" className="text-sm text-gray-700">
                    No drafts awaiting approval.
                  </Text>
                </div>
              ) : (
                metrics.draftsAwaitingApproval.map((r) => (
                  <div key={r.id} className="rounded-lg border border-gray-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Text variant="body" className="text-sm font-medium text-gray-900">
                          {r.rating}/5 · {r.authorName ?? "—"}
                        </Text>
                        <Text variant="body" className="mt-1 text-xs text-gray-500">
                          {new Date(r.createdAt).toLocaleString()}
                        </Text>
                        <Text variant="body" className="mt-1 text-xs text-gray-500">
                          Draft: {r.method}
                        </Text>
                      </div>
                      <span
                        className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        Draft
                      </span>
                    </div>
                    <Text variant="body" className="mt-2 line-clamp-3 text-sm text-gray-700">
                      {r.comment ?? "— (no comment)"}
                    </Text>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <Text variant="subtitle" className="font-bold text-gray-900">
                Low ratings not answered
              </Text>
              <Text variant="body" className="mt-1 text-sm text-gray-600">
                Pending or failed reviews with 1–2 stars
              </Text>

              <div className="mt-4 space-y-3">
                {metrics.lowRatingOpen.length === 0 ? (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <Text variant="body" className="text-sm text-gray-700">
                      Nothing urgent here.
                    </Text>
                  </div>
                ) : (
                  metrics.lowRatingOpen.map((r) => (
                    <div key={r.id} className="rounded-lg border border-gray-100 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Text variant="body" className="text-sm font-medium text-gray-900">
                            {r.rating}/5 · {r.authorName ?? "—"}
                          </Text>
                          <Text variant="body" className="mt-1 text-xs text-gray-500">
                            {new Date(r.createdAt).toLocaleString()}
                          </Text>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            r.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : r.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <Text variant="body" className="mt-2 line-clamp-3 text-sm text-gray-700">
                        {r.comment ?? "— (no comment)"}
                      </Text>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
