import type { ReactNode } from "react";
import type { ReviewInsight } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextReportDate } from "@/lib/insights/schedule";
import {
  INSIGHT_WINDOW_MONTHS,
  MIN_COMMENTS_FOR_INSIGHT,
  type InsightItem,
} from "@/lib/insights/schema";
import { Card } from "@/components/Card";
import { EmptyState, formatPeriod, parseItems, periodFormatter } from "./shared";

type Kind = "strength" | "improvement";
type Quote = { id: string; rating: number; authorName: string | null; comment: string | null };

// Request-time value: these pages render per request, so "now" is the visit.
function daysUntil(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

function Delta({ value, digits = 0, suffix = "" }: { value: number; digits?: number; suffix?: string }) {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return <span className="text-xs font-medium text-gray-500">No change</span>;
  return (
    <span className={`text-xs font-medium ${rounded > 0 ? "text-emerald-700" : "text-rose-700"}`}>
      {rounded > 0 ? "↑" : "↓"} {Math.abs(rounded).toFixed(digits)}
      {suffix} vs last report
    </span>
  );
}

function Kpi({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      {detail ? <div className="mt-0.5 min-h-4 text-xs text-gray-500">{detail}</div> : null}
    </div>
  );
}

function Highlight({ tone, label, title }: { tone: "strength" | "improvement"; label: string; title: string }) {
  const styles =
    tone === "strength" ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100";
  const dot = tone === "strength" ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${styles}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
      <span className="truncate font-semibold">{title}</span>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-gray-300">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

const kindStyles = {
  strength: {
    heading: "What's working",
    subtitle: "What customers praise most.",
    dot: "bg-emerald-500",
    strip: "bg-emerald-400",
    rank: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
    action: "bg-emerald-50 text-emerald-900",
    actionLabel: "Keep it up",
    empty: "No clear pattern of praise in this period yet.",
  },
  improvement: {
    heading: "What to improve",
    subtitle: "What customers complain about most.",
    dot: "bg-amber-500",
    strip: "bg-amber-400",
    rank: "bg-amber-100 text-amber-800",
    bar: "bg-amber-500",
    action: "bg-amber-50 text-amber-900",
    actionLabel: "Next step",
    empty: "No recurring complaints in this period. Nice work.",
  },
} as const;

// More mentions is good news for a strength and bad news for a problem.
function TrendBadge({ kind, item, previous }: { kind: Kind; item: InsightItem; previous?: InsightItem }) {
  if (!previous) {
    return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">New</span>;
  }
  const delta = item.mentions - previous.mentions;
  if (delta === 0) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">No change</span>;
  }
  const good = kind === "strength" ? delta > 0 : delta < 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        good ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
      }`}
      title={`${previous.mentions} mentions in the last report`}
    >
      {delta > 0 ? "↑" : "↓"} {Math.abs(delta)} vs last report
    </span>
  );
}

function QuoteBlock({ quote }: { quote: Quote }) {
  return (
    <figure className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
      <blockquote className="line-clamp-3 text-gray-700">“{quote.comment}”</blockquote>
      <figcaption className="mt-1 text-xs text-gray-500">
        <Stars rating={quote.rating} /> {quote.authorName ? `· ${quote.authorName}` : null}
      </figcaption>
    </figure>
  );
}

function InsightCard({
  kind,
  index,
  item,
  previous,
  quotes,
  commentCount,
  showTrend,
}: {
  kind: Kind;
  index: number;
  item: InsightItem;
  previous?: InsightItem;
  quotes: Quote[];
  commentCount: number;
  showTrend: boolean;
}) {
  const style = kindStyles[kind];
  const share = commentCount ? Math.min(100, Math.round((item.mentions / commentCount) * 100)) : 0;
  const [featured, ...moreQuotes] = quotes;

  return (
    <li className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1 ${style.strip}`} aria-hidden="true" />

      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${style.rank}`}>
          {index + 1}
        </span>
        {showTrend ? <TrendBadge kind={kind} item={item} previous={previous} /> : null}
      </div>

      <h3 className="mt-3 text-base font-semibold text-gray-900">{item.title}</h3>

      <div className="mt-2">
        <div className="flex items-baseline justify-between text-xs text-gray-500">
          <span>
            {item.mentions} {item.mentions === 1 ? "review" : "reviews"}
            {item.avgRating !== null ? ` · ${item.avgRating.toFixed(1)}★ avg` : null}
          </span>
          <span>{share}% of written reviews</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${share}%` }} />
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600">{item.summary}</p>

      {featured ? (
        <div className="mt-4 space-y-2">
          <QuoteBlock quote={featured} />
          {moreQuotes.length ? (
            <details className="group">
              <summary className="cursor-pointer list-none text-xs font-medium text-gray-500 hover:text-gray-700">
                <span className="group-open:hidden">
                  Show {moreQuotes.length} more {moreQuotes.length === 1 ? "quote" : "quotes"}
                </span>
                <span className="hidden group-open:inline">Hide quotes</span>
              </summary>
              <div className="mt-2 space-y-2">
                {moreQuotes.map((q) => (
                  <QuoteBlock key={q.id} quote={q} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      {/* mt-auto keeps the action aligned at the bottom across cards in a row. */}
      <div className="mt-auto pt-4">
        <div className={`rounded-xl px-3 py-2.5 text-sm ${style.action}`}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{style.actionLabel}</p>
          <p className="mt-0.5">{item.suggestion}</p>
        </div>
      </div>
    </li>
  );
}

function InsightSection({
  kind,
  items,
  previousItems,
  quotes,
  commentCount,
  showTrend,
}: {
  kind: Kind;
  items: InsightItem[];
  previousItems: InsightItem[];
  quotes: Map<string, Quote>;
  commentCount: number;
  showTrend: boolean;
}) {
  const style = kindStyles[kind];
  const previousByTheme = new Map(previousItems.map((i) => [i.theme, i]));
  // Problems from the last report that dropped out of this one.
  const resolved =
    kind === "improvement" && showTrend
      ? previousItems.filter((p) => !items.some((i) => i.theme === p.theme))
      : [];

  return (
    <section>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900">{style.heading}</h2>
      </div>
      <p className="mt-0.5 text-sm text-gray-500">{style.subtitle}</p>

      {items.length ? (
        <ol className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, i) => (
            <InsightCard
              key={item.theme}
              kind={kind}
              index={i}
              item={item}
              previous={previousByTheme.get(item.theme)}
              quotes={item.reviewIds.map((id) => quotes.get(id)).filter((q): q is Quote => Boolean(q?.comment))}
              commentCount={commentCount}
              showTrend={showTrend}
            />
          ))}
        </ol>
      ) : (
        <Card className="mt-4">
          <p className="text-sm text-gray-500">{style.empty}</p>
        </Card>
      )}

      {resolved.length ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span aria-hidden="true">✓</span>
          <span>
            <span className="font-semibold">No longer a top issue:</span> {resolved.map((r) => r.title).join(", ")}
          </span>
        </p>
      ) : null}
    </section>
  );
}

/**
 * Full report for one insight. Trends compare against the ready report just
 * before it, so a past report shows the trends it had at the time.
 * `isLatest` swaps the "Next report" KPI for the date it was generated.
 */
export async function InsightReport({ insight, isLatest }: { insight: ReviewInsight; isLatest: boolean }) {
  const previous = await prisma.reviewInsight.findFirst({
    where: { businessId: insight.businessId, status: "ready", periodEnd: { lt: insight.periodEnd } },
    orderBy: { periodEnd: "desc" },
    select: { strengths: true, improvements: true, reviewCount: true, avgRating: true },
  });

  const strengths = parseItems(insight.strengths);
  const improvements = parseItems(insight.improvements);

  const nextReport = nextReportDate(insight.periodEnd);
  const daysToNext = daysUntil(nextReport);
  const writtenShare = insight.reviewCount ? Math.round((insight.commentCount / insight.reviewCount) * 100) : 0;
  const topStrength = strengths[0];
  const topIssue = improvements[0];

  const stats = (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {isLatest ? `Last ${INSIGHT_WINDOW_MONTHS} months` : "Past report"}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            {formatPeriod(insight.periodStart, insight.periodEnd)}
          </h2>
        </div>
        {insight.status === "ready" && (topStrength || topIssue) ? (
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row lg:max-w-xl">
            {topStrength ? <Highlight tone="strength" label="Top strength" title={topStrength.title} /> : null}
            {topIssue ? <Highlight tone="improvement" label="Top issue" title={topIssue.title} /> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Avg rating"
          value={
            insight.avgRating !== null ? (
              <>
                {insight.avgRating.toFixed(1)}
                <span className="ml-1 text-lg text-amber-500">★</span>
              </>
            ) : (
              "—"
            )
          }
          detail={
            insight.avgRating !== null && previous?.avgRating != null ? (
              <Delta value={insight.avgRating - previous.avgRating} digits={1} suffix="★" />
            ) : null
          }
        />
        <Kpi
          label="Reviews"
          value={insight.reviewCount}
          detail={previous ? <Delta value={insight.reviewCount - previous.reviewCount} /> : null}
        />
        <Kpi label="With text" value={insight.commentCount} detail={`${writtenShare}% of reviews`} />
        {isLatest ? (
          <Kpi
            label="Next report"
            value={periodFormatter.format(nextReport).replace(/ \d{4}$/, "")}
            detail={daysToNext === 0 ? "Today" : `In ${daysToNext} ${daysToNext === 1 ? "day" : "days"}`}
          />
        ) : (
          <Kpi
            label="Generated"
            value={periodFormatter.format(insight.createdAt).replace(/ \d{4}$/, "")}
            detail={insight.createdAt.getUTCFullYear()}
          />
        )}
      </div>
    </Card>
  );

  if (insight.status !== "ready") {
    return (
      <>
        {stats}
        <EmptyState
          title="Not enough reviews yet"
          body={`We need at least ${MIN_COMMENTS_FOR_INSIGHT} reviews with written comments in the last ${INSIGHT_WINDOW_MONTHS} months to spot real patterns. ${
            isLatest ? `You have ${insight.commentCount}. We'll check again next month.` : `This period had ${insight.commentCount}.`
          }`}
        />
      </>
    );
  }

  const quoteIds = [...strengths, ...improvements].flatMap((i) => i.reviewIds);
  const quoteRows = await prisma.review.findMany({
    where: { businessId: insight.businessId, id: { in: quoteIds } },
    select: { id: true, rating: true, authorName: true, comment: true },
  });
  const quotes = new Map(quoteRows.map((q) => [q.id, q]));

  return (
    <>
      {stats}
      <InsightSection
        kind="strength"
        items={strengths}
        previousItems={parseItems(previous?.strengths)}
        quotes={quotes}
        commentCount={insight.commentCount}
        showTrend={Boolean(previous)}
      />
      <InsightSection
        kind="improvement"
        items={improvements}
        previousItems={parseItems(previous?.improvements)}
        quotes={quotes}
        commentCount={insight.commentCount}
        showTrend={Boolean(previous)}
      />
    </>
  );
}
