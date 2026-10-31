import Link from "next/link";
import { prisma } from "@/lib/db";
import { MIN_COMMENTS_FOR_INSIGHT } from "@/lib/insights/schema";
import { Card } from "@/components/Card";
import { InlineNotification } from "@/components/InlineNotification";
import { EmptyState, addDays, formatPeriod, getInsightsAccess, parseItems, periodFormatter } from "../_components/shared";

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });
const monthYearFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

type Report = {
  id: string;
  status: "ready" | "insufficient_data";
  periodStart: Date;
  periodEnd: Date;
  reviewCount: number;
  commentCount: number;
  avgRating: number | null;
  strengths: unknown;
  improvements: unknown;
};

// The last day of the window is the month a report is "for".
function reportMonth(r: Report) {
  return addDays(r.periodEnd, -1);
}

function reportHref(r: Report, index: number) {
  return index === 0 ? "/insights" : `/insights/${r.id}`;
}

/**
 * Avg rating per report, oldest to newest. The line is drawn in a stretched
 * SVG and the dots are HTML on top, so they stay round at any width.
 */
function RatingChart({ reports }: { reports: Report[] }) {
  const points = reports
    .map((r, i) => ({ r, href: reportHref(r, i) }))
    .filter((p): p is { r: Report & { avgRating: number }; href: string } => p.r.avgRating !== null)
    .reverse();
  if (points.length < 2) return null;

  const ratings = points.map((p) => p.r.avgRating);
  // Half-star bounds with some headroom so small changes are still visible.
  const lo = Math.max(1, Math.floor((Math.min(...ratings) - 0.25) * 2) / 2);
  const hi = Math.min(5, Math.ceil((Math.max(...ratings) + 0.25) * 2) / 2);
  const ticks: number[] = [];
  for (let t = hi; t >= lo - 1e-9; t -= 0.5) ticks.push(t);

  const x = (i: number) => (points.length === 1 ? 50 : (i / (points.length - 1)) * 100);
  const y = (v: number) => ((hi - v) / (hi - lo)) * 100;
  const line = points.map((p, i) => `${x(i)},${y(p.r.avgRating)}`).join(" ");
  const first = ratings[0];
  const last = ratings[ratings.length - 1];
  const change = Number((last - first).toFixed(1));

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Average rating over time</h2>
          <p className="mt-0.5 text-sm text-gray-500">One point per monthly report.</p>
        </div>
        <p className="text-sm text-gray-500">
          {change === 0 ? (
            "Unchanged since the first report"
          ) : (
            <>
              <span className={`font-semibold ${change > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {change > 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}★
              </span>{" "}
              since {monthYearFormatter.format(reportMonth(points[0].r))}
            </>
          )}
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        {/* y-axis labels */}
        <div className="relative h-40 w-7 shrink-0 text-right text-xs tabular-nums text-gray-400">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${y(t)}%` }}>
              {t.toFixed(1)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 px-2">
          <div className="relative h-40">
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {ticks.map((t) => (
                <line key={t} x1="0" x2="100" y1={y(t)} y2={y(t)} className="stroke-gray-100" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              <polyline
                points={line}
                fill="none"
                className="stroke-gray-900"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {points.map((p, i) => {
              const isLast = i === points.length - 1;
              return (
                <Link
                  key={p.r.id}
                  href={p.href}
                  className="group absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-gray-900"
                  style={{ left: `${x(i)}%`, top: `${y(p.r.avgRating)}%` }}
                  aria-label={`${monthYearFormatter.format(reportMonth(p.r))}: ${p.r.avgRating.toFixed(1)} stars from ${p.r.reviewCount} reviews`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ring-2 ring-white transition-transform group-hover:scale-150 ${
                      p.r.status === "ready" ? "bg-gray-900" : "border-2 border-gray-900 bg-white"
                    }`}
                  />
                  {isLast ? (
                    <span className="absolute bottom-full mb-0.5 text-xs font-semibold tabular-nums text-gray-900 group-hover:hidden">
                      {p.r.avgRating.toFixed(1)}
                    </span>
                  ) : null}
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-visible:block">
                    <span className="font-semibold">{monthYearFormatter.format(reportMonth(p.r))}</span>
                    <span className="text-gray-300">
                      {" "}
                      · {p.r.avgRating.toFixed(1)}★ · {p.r.reviewCount} reviews
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          {/* x-axis labels */}
          <div className="relative mt-3 h-4 text-xs text-gray-400">
            {points.map((p, i) => (
              <span
                key={p.r.id}
                className={`absolute whitespace-nowrap ${
                  i === 0 ? "left-0" : i === points.length - 1 ? "right-0" : "-translate-x-1/2"
                }`}
                style={i === 0 || i === points.length - 1 ? undefined : { left: `${x(i)}%` }}
              >
                {monthFormatter.format(reportMonth(p.r))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Round the axis up to 1, 2 or 5 times a power of ten, split into 4 steps.
function niceAxisMax(value: number) {
  if (value <= 4) return 4;
  const step = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(step));
  const nice = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= step) ?? step;
  return nice * 4;
}

const VOLUME_SERIES = [
  { key: "reviewCount", label: "Total reviews", line: "stroke-gray-900", dot: "bg-gray-900" },
  { key: "commentCount", label: "With text", line: "stroke-blue-500", dot: "bg-blue-500" },
] as const;

/**
 * Total reviews and reviews with text per report, oldest to newest. Same
 * layout as RatingChart: stretched SVG lines with HTML dots on top.
 */
function VolumeChart({ reports }: { reports: Report[] }) {
  const points = reports.map((r, i) => ({ r, href: reportHref(r, i) })).reverse();
  if (points.length < 2) return null;

  const hi = niceAxisMax(Math.max(...points.map((p) => p.r.reviewCount)));
  const ticks = [hi, (hi * 3) / 4, hi / 2, hi / 4, 0];

  const x = (i: number) => (i / (points.length - 1)) * 100;
  const y = (v: number) => ((hi - v) / hi) * 100;
  // The first report reads 3 months, so its counts aren't comparable to a month.
  const firstIsLonger = addDays(points[0].r.periodStart, 45) < points[0].r.periodEnd;

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Reviews over time</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            One point per monthly report.{firstIsLonger ? " Your first report covers 3 months." : ""}
          </p>
        </div>
        <div className="flex gap-4 text-sm text-gray-500">
          {VOLUME_SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {/* y-axis labels */}
        <div className="relative h-40 w-7 shrink-0 text-right text-xs tabular-nums text-gray-400">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${y(t)}%` }}>
              {t}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 px-2">
          <div className="relative h-40">
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {ticks.map((t) => (
                <line key={t} x1="0" x2="100" y1={y(t)} y2={y(t)} className="stroke-gray-100" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              {VOLUME_SERIES.map((s) => (
                <polyline
                  key={s.key}
                  points={points.map((p, i) => `${x(i)},${y(p.r[s.key])}`).join(" ")}
                  fill="none"
                  className={s.line}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {points.map((p, i) =>
              VOLUME_SERIES.map((s) => (
                <span
                  key={`${p.r.id}-${s.key}`}
                  className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${s.dot}`}
                  style={{ left: `${x(i)}%`, top: `${y(p.r[s.key])}%` }}
                  aria-hidden="true"
                />
              ))
            )}

            {/* One hover/focus target per report, spanning the full height. */}
            {points.map((p, i) => (
              <Link
                key={p.r.id}
                href={p.href}
                className="group absolute top-0 flex h-full w-8 -translate-x-1/2 justify-center focus-visible:outline-2 focus-visible:outline-gray-900"
                style={{ left: `${x(i)}%` }}
                aria-label={`${monthYearFormatter.format(reportMonth(p.r))}: ${p.r.reviewCount} reviews, ${p.r.commentCount} with text`}
              >
                <span
                  className="pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-visible:block"
                  style={{ bottom: `calc(${100 - y(p.r.reviewCount)}% + 0.5rem)` }}
                >
                  <span className="font-semibold">{monthYearFormatter.format(reportMonth(p.r))}</span>
                  <span className="text-gray-300">
                    {" "}
                    · {p.r.reviewCount} reviews · {p.r.commentCount} with text
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {/* x-axis labels */}
          <div className="relative mt-3 h-4 text-xs text-gray-400">
            {points.map((p, i) => (
              <span
                key={p.r.id}
                className={`absolute whitespace-nowrap ${
                  i === 0 ? "left-0" : i === points.length - 1 ? "right-0" : "-translate-x-1/2"
                }`}
                style={i === 0 || i === points.length - 1 ? undefined : { left: `${x(i)}%` }}
              >
                {monthFormatter.format(reportMonth(p.r))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function RatingDelta({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return null;
  const d = Number((current - previous).toFixed(1));
  if (d === 0) return <span className="text-xs text-gray-400">no change</span>;
  return (
    <span className={`text-xs font-medium ${d > 0 ? "text-emerald-700" : "text-rose-700"}`}>
      {d > 0 ? "↑" : "↓"} {Math.abs(d).toFixed(1)}
    </span>
  );
}

function ThemeLine({ tone, title }: { tone: "strength" | "improvement"; title?: string }) {
  const dot = tone === "strength" ? "bg-emerald-500" : "bg-amber-500";
  const label = tone === "strength" ? "Top strength" : "Top issue";
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className={`truncate font-medium ${title ? "text-gray-900" : "text-gray-400"}`}>
        {title ?? (tone === "improvement" ? "None found" : "—")}
      </span>
    </div>
  );
}

function ReportItem({ report, index, previous }: { report: Report; index: number; previous?: Report }) {
  const month = reportMonth(report);
  const isLatest = index === 0;
  const ready = report.status === "ready";

  return (
    <li className="group relative pl-8">
      {/* timeline rail (bridges the gap to the next item) + node */}
      <span className="absolute -bottom-4 left-[7px] top-6 w-px bg-gray-200 group-last:hidden" aria-hidden="true" />
      <span
        className={`absolute left-0 top-6 h-[15px] w-[15px] rounded-full border-2 ${
          isLatest ? "border-gray-900 bg-gray-900" : ready ? "border-gray-300 bg-white" : "border-gray-200 bg-gray-50"
        }`}
        aria-hidden="true"
      />

      <Link
        href={reportHref(report, index)}
        className={`group/card block rounded-2xl border p-5 transition-colors ${
          ready ? "border-gray-100 bg-white shadow-sm hover:border-gray-200" : "border-dashed border-gray-200 bg-gray-50/60 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-lg font-semibold ${ready ? "text-gray-900" : "text-gray-500"}`}>
                {monthYearFormatter.format(month)}
              </h3>
              {isLatest ? (
                <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-medium text-white">Latest</span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{formatPeriod(report.periodStart, report.periodEnd)}</p>
          </div>
          <span className="mt-1 shrink-0 text-sm font-medium text-gray-400 transition-colors group-hover/card:text-gray-900">
            View →
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-gray-900">
              {report.avgRating !== null ? report.avgRating.toFixed(1) : "—"}
            </span>
            <span className="text-amber-500">★</span>
            <RatingDelta current={report.avgRating} previous={previous?.avgRating ?? null} />
          </span>
          <span className="text-sm text-gray-500">
            <span className="font-semibold tabular-nums text-gray-900">{report.reviewCount}</span> reviews ·{" "}
            <span className="tabular-nums">{report.commentCount}</span> with text
          </span>
        </div>

        {ready ? (
          <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-2 sm:gap-4">
            <ThemeLine tone="strength" title={parseItems(report.strengths)[0]?.title} />
            <ThemeLine tone="improvement" title={parseItems(report.improvements)[0]?.title} />
          </div>
        ) : (
          <p className="mt-4 border-t border-gray-200 pt-4 text-sm text-gray-500">
            Not enough written reviews to spot patterns ({report.commentCount} of {MIN_COMMENTS_FOR_INSIGHT} needed).
          </p>
        )}
      </Link>
    </li>
  );
}

export default async function InsightsHistoryPage() {
  const { business, allowed } = await getInsightsAccess();
  if (!business || !allowed) return null;

  const [rows, lastFailure] = await Promise.all([
    prisma.reviewInsight.findMany({
      where: { businessId: business.id, status: { in: ["ready", "insufficient_data"] } },
      orderBy: { periodEnd: "desc" },
      select: {
        id: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        reviewCount: true,
        commentCount: true,
        avgRating: true,
        strengths: true,
        improvements: true,
      },
    }),
    prisma.reviewInsight.findFirst({
      where: { businessId: business.id, status: "failed" },
      orderBy: { periodEnd: "desc" },
      select: { periodEnd: true },
    }),
  ]);
  const reports = rows as Report[];

  // Failed runs retry daily with a new periodEnd, so they pile up. Only
  // surface one, and only while no newer report has replaced it.
  const latest = reports[0];
  const pendingRetry = lastFailure && (!latest || lastFailure.periodEnd > latest.periodEnd);

  if (!reports.length && !pendingRetry) {
    return (
      <EmptyState
        title="No reports yet"
        body="Each monthly report will be listed here so you can see how your reviews change over time."
      />
    );
  }

  return (
    <div className="space-y-8">
      {pendingRetry ? (
        <InlineNotification tone="info">
          We couldn&apos;t finish your latest report on {periodFormatter.format(lastFailure.periodEnd)}. We&apos;ll
          try again automatically within 24 hours.
        </InlineNotification>
      ) : null}

      <RatingChart reports={reports} />
      <VolumeChart reports={reports} />

      {reports.length ? (
        <section>
          <h2 className="text-lg font-semibold text-gray-900">All reports</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {reports.length} {reports.length === 1 ? "report" : "reports"}, newest first.
          </p>
          <ol className="mt-4 space-y-4">
            {reports.map((r, i) => (
              <ReportItem key={r.id} report={r} index={i} previous={reports[i + 1]} />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
