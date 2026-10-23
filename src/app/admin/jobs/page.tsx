import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/date";
import { Badge, Card, PageHeader, formatRelative, type BadgeTone } from "../ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
/** A job still "running" after this long was killed (timeout/crash) and never finished. */
const STUCK_AFTER_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const statusFilters = ["all", "success", "failed", "running"] as const;
const typeFilters = ["all", "sync_reviews", "auto_responder"] as const;
type StatusFilter = (typeof statusFilters)[number];
type TypeFilter = (typeof typeFilters)[number];

const typeLabels: Record<Exclude<TypeFilter, "all">, string> = {
  sync_reviews: "Review sync",
  auto_responder: "Auto-replies",
};

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T {
  return allowed.includes(value as T) ? (value as T) : allowed[0];
}

// Request-time boundaries, computed per request (this page is force-dynamic).
function getTimeWindows() {
  const now = Date.now();
  return { stuckBefore: new Date(now - STUCK_AFTER_MS), dayAgo: new Date(now - DAY_MS) };
}

function formatDuration(start: Date, end: Date | null) {
  if (!end) return "—";
  const seconds = (end.getTime() - start.getTime()) / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function buildHref(params: { status: StatusFilter; type: TypeFilter; business?: string; before?: string }) {
  const search = new URLSearchParams();
  if (params.status !== "all") search.set("status", params.status);
  if (params.type !== "all") search.set("type", params.type);
  if (params.business) search.set("business", params.business);
  if (params.before) search.set("before", params.before);
  const query = search.toString();
  return query ? `/admin/jobs?${query}` : "/admin/jobs";
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </Link>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "red" | "amber" }) {
  const valueClass = tone === "red" && value > 0 ? "text-red-600" : tone === "amber" && value > 0 ? "text-amber-600" : "text-gray-900";
  return (
    <Card className="!p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${valueClass}`}>{value}</p>
    </Card>
  );
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; business?: string; before?: string }>;
}) {
  const params = await searchParams;
  const status = pick(params.status, statusFilters);
  const type = pick(params.type, typeFilters);
  const businessId = params.business || undefined;
  const before = params.before && !Number.isNaN(Date.parse(params.before)) ? new Date(params.before) : undefined;

  const { stuckBefore, dayAgo } = getTimeWindows();

  const where: Prisma.JobRunWhereInput = {
    ...(status !== "all" ? { status } : {}),
    ...(type !== "all" ? { type } : {}),
    ...(businessId ? { businessId } : {}),
    ...(before ? { startedAt: { lt: before } } : {}),
  };

  const [runs, last24h, failed24h, stuck, filteredBusiness] = await Promise.all([
    prisma.jobRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        type: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        processed: true,
        responded: true,
        skipped: true,
        error: true,
        business: { select: { id: true, name: true } },
      },
    }),
    prisma.jobRun.count({ where: { startedAt: { gte: dayAgo } } }),
    prisma.jobRun.count({ where: { status: "failed", startedAt: { gte: dayAgo } } }),
    prisma.jobRun.count({ where: { status: "running", startedAt: { lt: stuckBefore } } }),
    businessId ? prisma.business.findUnique({ where: { id: businessId }, select: { name: true } }) : null,
  ]);

  const hasMore = runs.length > PAGE_SIZE;
  const page = hasMore ? runs.slice(0, PAGE_SIZE) : runs;
  const nextBefore = hasMore ? page[page.length - 1].startedAt.toISOString() : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" subtitle="Review syncs and auto-reply runs, newest first." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <SummaryCard label="Runs in the last 24h" value={last24h} />
        <SummaryCard label="Failed in the last 24h" value={failed24h} tone="red" />
        <SummaryCard label="Stuck (running > 15 min)" value={stuck} tone="amber" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((s) => (
            <FilterChip key={s} href={buildHref({ status: s, type, business: businessId })} active={status === s}>
              {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((t) => (
            <FilterChip key={t} href={buildHref({ status, type: t, business: businessId })} active={type === t}>
              {t === "all" ? "All jobs" : typeLabels[t]}
            </FilterChip>
          ))}
        </div>
      </div>

      {businessId ? (
        <p className="text-sm text-gray-600">
          Showing jobs for <span className="font-semibold text-gray-900">{filteredBusiness?.name ?? "unknown business"}</span>.{" "}
          <Link href={buildHref({ status, type })} className="font-semibold text-blue-600 hover:text-blue-500">
            Show all businesses
          </Link>
        </p>
      ) : null}

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">Started</th>
                <th scope="col" className="px-4 py-3">Job</th>
                <th scope="col" className="px-4 py-3">Business</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Result</th>
                <th scope="col" className="px-6 py-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {page.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No jobs match these filters.</td>
                </tr>
              ) : (
                page.map((job) => {
                  const isStuck = job.status === "running" && job.startedAt < stuckBefore;
                  const badge: { label: string; tone: BadgeTone } = isStuck
                    ? { label: "stuck", tone: "amber" }
                    : job.status === "success"
                      ? { label: "success", tone: "green" }
                      : job.status === "failed"
                        ? { label: "failed", tone: "red" }
                        : { label: "running", tone: "blue" };
                  return (
                    <tr key={job.id} className="align-top hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-6 py-3">
                        <span className="text-gray-900">{formatDateTime(job.startedAt)}</span>
                        <p className="text-xs text-gray-400">{formatRelative(job.startedAt)}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-900">{typeLabels[job.type]}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={buildHref({ status, type, business: job.business.id })}
                          className="text-gray-700 hover:underline"
                          title="Show only this business"
                        >
                          {job.business.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {job.status === "failed" || job.error ? (
                          <p className="line-clamp-3 max-w-md text-red-600" title={job.error ?? undefined}>
                            {job.error || "Failed without an error message"}
                          </p>
                        ) : job.status !== "success" ? (
                          <span className="text-gray-400">{isStuck ? "Never finished" : "In progress"}</span>
                        ) : job.type === "sync_reviews" ? (
                          `${job.processed} reviews synced`
                        ) : (
                          `${job.responded} replied · ${job.skipped} skipped · ${job.processed} processed`
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-gray-600">
                        {formatDuration(job.startedAt, job.finishedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {nextBefore || before ? (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-sm">
            {before ? (
              <Link href={buildHref({ status, type, business: businessId })} className="font-semibold text-blue-600 hover:text-blue-500">
                ← Newest
              </Link>
            ) : (
              <span />
            )}
            {nextBefore ? (
              <Link
                href={buildHref({ status, type, business: businessId, before: nextBefore })}
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Older →
              </Link>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
