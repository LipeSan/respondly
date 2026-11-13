import Link from "next/link";
import { ADMIN_OVERVIEW_RANGES, getAdminOverviewData, parseAdminOverviewRange } from "@/lib/adminData";
import { formatAdminDateTime } from "@/lib/date";
import {
  Badge,
  Card,
  CardHeader,
  HealthDot,
  PageHeader,
  formatAuditAction,
  formatMoney,
  formatRelative,
  planBadge,
} from "./ui";
import { DailyCountChart, DailyReviewsChart } from "./OverviewCharts";

export const dynamic = "force-dynamic";

function Delta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="text-xs text-gray-400">All time</span>;
  if (previous === 0) return <span className="text-xs text-gray-400">No data for the previous period</span>;
  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-gray-500">Same as previous period</span>;
  return (
    <span className={`text-xs font-medium ${diff > 0 ? "text-emerald-600" : "text-red-600"}`}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff)} <span className="font-normal text-gray-500">vs previous period</span>
    </span>
  );
}

function KpiCard({ label, value, footer }: { label: string; value: string; footer: React.ReactNode }) {
  return (
    <Card className="!p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">{value}</p>
      <div className="mt-2">{footer}</div>
    </Card>
  );
}

const rangeLabels: Record<(typeof ADMIN_OVERVIEW_RANGES)[number], string> = {
  "7": "7d",
  "30": "30d",
  "90": "90d",
  all: "All",
};

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseAdminOverviewRange((await searchParams).range);
  const data = await getAdminOverviewData(range);
  const { system, kpis } = data;
  const period = range === "all" ? "all time" : `last ${data.rangeDays} days`;
  const periodTitle = range === "all" ? "All time" : `Last ${data.rangeDays} days`;

  const systemTone = system.cronStale
    ? { box: "border-red-200 bg-red-50", dot: "bg-red-500", title: "text-red-900", detail: "text-red-800" }
    : system.failuresLast26h > 0
      ? { box: "border-amber-200 bg-amber-50", dot: "bg-amber-500", title: "text-amber-900", detail: "text-amber-800" }
      : { box: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500", title: "text-emerald-900", detail: "text-emerald-800" };

  const systemTitle = system.cronStale
    ? "The daily cron hasn't run"
    : system.failuresLast26h > 0
      ? `${system.failuresLast26h} job ${system.failuresLast26h === 1 ? "failure" : "failures"} in the last 26h`
      : "Automation is running";

  const revenueCurrent = kpis.revenue.current[0];
  const revenuePrevious = kpis.revenue.previous?.find((r) => r.currency === revenueCurrent?.currency);
  const funnelTop = Math.max(1, data.funnel[0]?.count ?? 1);
  // Collapsed by default; the header badges still show how many customers need attention.
  const attentionCriticalCount = data.attention.filter((row) => row.issues.some((i) => i.severity === "critical")).length;
  const attentionTotal = data.attention.length + (data.incompleteSignups > 0 ? 1 : 0);
  const reviewsTotal = data.daily.reduce((sum, d) => sum + d.reviewsPositive + d.reviewsNeutral + d.reviewsNegative, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle={`What needs attention across all customers, ${period}.`}
        actions={
          <nav className="inline-flex rounded-lg border border-gray-200 bg-white p-1" aria-label="Date range">
            {ADMIN_OVERVIEW_RANGES.map((option) => (
              <Link
                key={option}
                href={option === "30" ? "/admin" : `/admin?range=${option}`}
                scroll={false}
                aria-current={range === option ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === option ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {rangeLabels[option]}
              </Link>
            ))}
          </nav>
        }
      />

      <div className={`flex items-start gap-3 rounded-2xl border p-4 ${systemTone.box}`}>
        <span className={`mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${systemTone.dot}`} />
        <div>
          <p className={`text-sm font-semibold ${systemTone.title}`}>{systemTitle}</p>
          <p className={`mt-0.5 text-sm ${systemTone.detail}`}>
            Last cron run {formatRelative(system.lastCronRunAt)} · {system.businessesSyncedLast26h} of{" "}
            {system.businessesExpected} automated {system.businessesExpected === 1 ? "business" : "businesses"} synced in
            the last 26h
            {system.cronStale ? ". Check the Vercel cron and CRON_SECRET." : ""}
          </p>
        </div>
      </div>

      <details className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Needs attention</h2>
              {attentionCriticalCount > 0 ? <Badge tone="red">{attentionCriticalCount} critical</Badge> : null}
              {attentionTotal - attentionCriticalCount > 0 ? (
                <Badge tone="amber">{attentionTotal - attentionCriticalCount} warning</Badge>
              ) : null}
              {attentionTotal === 0 ? <Badge tone="green">All healthy</Badge> : null}
            </div>
            <p className="mt-0.5 text-sm text-gray-500">Customers with a setup, billing or automation problem.</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Link href="/admin/customers?filter=attention" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
              View all
            </Link>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-gray-400 transition-transform duration-200 group-open:rotate-180"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </summary>
        <div className="mt-3 divide-y divide-gray-100">
          {data.attention.length === 0 && data.incompleteSignups === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">All customers look healthy.</p>
          ) : null}
          {data.attention.slice(0, 8).map((row) => {
            const plan = planBadge(row.subscription?.plan, row.subscription?.status);
            return (
              <Link
                key={row.id}
                href={`/admin/businesses/${row.id}`}
                className="group flex items-start justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-1.5">
                    <HealthDot level={row.health} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{row.name}</span>
                      <Badge tone={plan.tone}>{plan.label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{row.user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {row.issues.map((issue) => (
                        <Badge key={issue.code} tone={issue.severity === "critical" ? "red" : "amber"}>
                          {issue.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500">
                  →
                </span>
              </Link>
            );
          })}
          {data.incompleteSignups > 0 ? (
            <Link
              href="/admin/customers?filter=incomplete"
              className="group flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <HealthDot level="warning" />
                <span className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">{data.incompleteSignups}</span>{" "}
                  {data.incompleteSignups === 1 ? "person" : "people"} signed up over 3 days ago but never created a
                  business
                </span>
              </div>
              <span className="shrink-0 text-gray-300 group-hover:text-gray-500">→</span>
            </Link>
          ) : null}
          {data.attention.length > 8 ? (
            <p className="px-3 pt-3 text-sm text-gray-500">
              And {data.attention.length - 8} more.{" "}
              <Link href="/admin/customers?filter=attention" className="font-semibold text-blue-600">
                See all
              </Link>
            </p>
          ) : null}
        </div>
      </details>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Paying customers"
          value={String(kpis.payingCustomers)}
          footer={<span className="text-xs text-gray-500">{kpis.trialing} on trial</span>}
        />
        <KpiCard
          label="New signups"
          value={String(kpis.signups.current)}
          footer={<Delta current={kpis.signups.current} previous={kpis.signups.previous} />}
        />
        <KpiCard
          label="Revenue"
          value={revenueCurrent ? formatMoney(revenueCurrent.amount, revenueCurrent.currency) : "—"}
          footer={
            revenueCurrent && revenuePrevious ? (
              <span className="text-xs text-gray-500">
                {formatMoney(revenuePrevious.amount, revenuePrevious.currency)} in the previous period
              </span>
            ) : (
              <span className="text-xs text-gray-400">Paid invoices, {period}</span>
            )
          }
        />
        <KpiCard
          label="Replies sent"
          value={String(kpis.repliesSent.current)}
          footer={<Delta current={kpis.repliesSent.current} previous={kpis.repliesSent.previous} />}
        />
      </div>

      <Card>
        <CardHeader
          title={`Reviews per ${data.bucket}`}
          subtitle={`New Google reviews across all customers by rating, ${period} (Sydney time)`}
          action={
            <span className="text-sm tabular-nums text-gray-500">
              <span className="font-semibold text-gray-900">{reviewsTotal}</span> total
            </span>
          }
        />
        <DailyReviewsChart daily={data.daily} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={`Replies sent per ${data.bucket}`} subtitle={periodTitle} />
          <DailyCountChart
            daily={data.daily}
            metric="replies"
            name="Replies"
            emptyTitle="No replies sent in this period"
            emptyDetail="Replies posted by the auto responder or by customers will show up here."
          />
        </Card>
        <Card>
          <CardHeader title={`Signups per ${data.bucket}`} subtitle={`${periodTitle}, customers only`} />
          <DailyCountChart
            daily={data.daily}
            metric="signups"
            name="Signups"
            emptyTitle="No signups in this period"
            emptyDetail="New customer accounts will show up here."
          />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Signup funnel" subtitle="All time, customers only" />
          <div className="mt-5 space-y-3">
            {data.funnel.map((step, index) => {
              const previous = index > 0 ? data.funnel[index - 1].count : null;
              const conversion = previous ? Math.round((step.count / previous) * 100) : null;
              return (
                <div key={step.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-gray-700">{step.label}</span>
                    <span className="tabular-nums text-gray-900">
                      <span className="font-semibold">{step.count}</span>
                      {conversion !== null ? <span className="ml-2 text-xs text-gray-400">{conversion}%</span> : null}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(step.count / funnelTop) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            action={
              <Link href="/admin/audit" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                Audit log
              </Link>
            }
          />
          <ul className="mt-3 divide-y divide-gray-100">
            {data.recentActivity.length === 0 ? (
              <li className="py-6 text-center text-sm text-gray-500">No activity yet.</li>
            ) : (
              data.recentActivity.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="min-w-0 text-sm">
                    <p className="text-gray-900">
                      {formatAuditAction(log.action)}
                      {log.targetBusiness ? (
                        <>
                          {" · "}
                          <Link href={`/admin/businesses/${log.targetBusiness.id}`} className="font-medium hover:underline">
                            {log.targetBusiness.name}
                          </Link>
                        </>
                      ) : log.targetUser ? (
                        <span className="text-gray-500"> · {log.targetUser.email}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-gray-500">by {log.actorUser.name || log.actorUser.email}</p>
                  </div>
                  <time className="shrink-0 text-xs text-gray-400" dateTime={log.createdAt.toISOString()} title={formatAdminDateTime(log.createdAt)}>
                    {formatRelative(log.createdAt)}
                  </time>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
