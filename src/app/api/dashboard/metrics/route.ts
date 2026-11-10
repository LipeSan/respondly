import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { getAutoResponderGate } from "@/lib/plan";
import { automatedReviewsWhere, isBeforeAutomation } from "@/lib/reviews/automationWindow";

const DAY_MS = 24 * 60 * 60 * 1000;
const LIST_LIMIT = 5;

function clampRangeDays(v: unknown) {
  const n = Number(v);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

function reviewDate(r: { createdAtGoogle: Date | null; createdAt: Date }) {
  return r.createdAtGoogle ?? r.createdAt;
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/** Calendar day ("YYYY-MM-DD") of an instant in the business's timezone. */
function dayKey(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function shiftDayKey(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calendar-day buckets in the business's timezone, ending today: daily for 7 days, weekly
 * otherwise (local businesses get few reviews per day). Weeks are counted back from today,
 * so the oldest one may be shorter. Each bucket carries its first and last day.
 */
function buildBuckets(now: Date, rangeDays: number, timeZone: string) {
  const size = rangeDays <= 7 ? 1 : 7;
  const today = dayKey(now, timeZone);
  const buckets: Array<{ from: string; to: string }> = [];
  for (let endOffset = 0; endOffset < rangeDays; endOffset += size) {
    const startOffset = Math.min(endOffset + size - 1, rangeDays - 1);
    buckets.unshift({ from: shiftDayKey(today, -startOffset), to: shiftDayKey(today, -endOffset) });
  }
  return { buckets, bucket: size === 1 ? ("day" as const) : ("week" as const) };
}

export async function GET(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const rangeDays = clampRangeDays(url.searchParams.get("range"));
  const now = new Date();
  const start = new Date(now.getTime() - rangeDays * DAY_MS);
  const previousStart = new Date(start.getTime() - rangeDays * DAY_MS);
  const connectedAt = business.connectedAt;
  const automatedWhere = automatedReviewsWhere(connectedAt);
  // Reviews no longer on Google are kept for history but never counted here.
  const live = { businessId: business.id, removedAt: null };

  const [
    google,
    gate,
    lastSync,
    rangeReviews,
    sentResponses,
    ratingGroups,
    draftsCount,
    drafts,
    lowRatingCount,
    lowRating,
    failedCount,
    recentReviews,
    removedCount,
  ] = await Promise.all([
    prisma.googleConnection.findUnique({ where: { businessId: business.id }, select: { id: true } }),
    getAutoResponderGate(business.id),
    prisma.jobRun.findFirst({
      where: { businessId: business.id, type: "sync_reviews", status: { in: ["success", "failed"] } },
      orderBy: { startedAt: "desc" },
      select: { status: true, finishedAt: true, startedAt: true },
    }),
    // Current + previous period, bucketed in memory (a local business has few reviews per period).
    prisma.review.findMany({
      where: {
        ...live,
        OR: [
          { createdAtGoogle: { gte: previousStart } },
          { createdAtGoogle: null, createdAt: { gte: previousStart } },
        ],
      },
      select: { rating: true, status: true, createdAt: true, createdAtGoogle: true },
    }),
    prisma.reviewResponse.findMany({
      where: { review: { businessId: business.id }, sentAt: { gte: previousStart } },
      select: { sentAt: true, review: { select: { createdAt: true, createdAtGoogle: true } } },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: live,
      _count: { _all: true },
    }),
    prisma.review.count({
      where: { ...live, status: "pending", response: { is: { sentAt: null } } },
    }),
    prisma.review.findMany({
      where: { ...live, status: "pending", response: { is: { sentAt: null } } },
      orderBy: [{ createdAtGoogle: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      take: LIST_LIMIT,
      select: { id: true, rating: true, authorName: true, comment: true, createdAt: true, createdAtGoogle: true },
    }),
    // Only reviews automation is responsible for; older ones are shown on the Reviews page.
    prisma.review.count({
      where: { AND: [{ ...live, status: { in: ["pending", "failed"] }, rating: { lte: 2 } }, automatedWhere] },
    }),
    prisma.review.findMany({
      where: { AND: [{ ...live, status: { in: ["pending", "failed"] }, rating: { lte: 2 } }, automatedWhere] },
      orderBy: [{ createdAtGoogle: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      take: LIST_LIMIT,
      select: { id: true, rating: true, authorName: true, comment: true, status: true, createdAt: true, createdAtGoogle: true },
    }),
    prisma.review.count({ where: { ...live, status: "failed" } }),
    prisma.review.findMany({
      where: live,
      orderBy: [{ createdAtGoogle: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      take: LIST_LIMIT,
      select: {
        id: true,
        rating: true,
        authorName: true,
        comment: true,
        status: true,
        createdAt: true,
        createdAtGoogle: true,
        lastError: true,
        response: { select: { finalText: true } },
      },
    }),
    prisma.review.count({ where: { businessId: business.id, removedAt: { not: null } } }),
  ]);

  const inCurrent = (d: Date) => d >= start;
  const current = rangeReviews.filter((r) => inCurrent(reviewDate(r)));
  const previous = rangeReviews.filter((r) => !inCurrent(reviewDate(r)));

  const responseMinutes = (rows: typeof sentResponses) =>
    average(
      rows
        .map((r) => (r.sentAt!.getTime() - reviewDate(r.review).getTime()) / 60000)
        .filter((m) => Number.isFinite(m) && m >= 0)
    );
  const currentSent = sentResponses.filter((r) => inCurrent(r.sentAt!));
  const previousSent = sentResponses.filter((r) => !inCurrent(r.sentAt!));

  // Bucket by the day the review was left, as the business sees it (not UTC, not rolling 24h).
  const timeZone = business.timezone || "Australia/Sydney";
  const { buckets, bucket } = buildBuckets(now, rangeDays, timeZone);
  const reviewDays = rangeReviews.map((r) => ({ day: dayKey(reviewDate(r), timeZone), status: r.status }));
  const series = buckets.map((b) => {
    const rows = reviewDays.filter((r) => r.day >= b.from && r.day <= b.to);
    const replied = rows.filter((r) => r.status === "responded").length;
    return { from: b.from, to: b.to, replied, notReplied: rows.length - replied };
  });

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let ratingTotal = 0;
  let ratingSum = 0;
  for (const g of ratingGroups) {
    if (g.rating >= 1 && g.rating <= 5) ratingDistribution[g.rating as 1 | 2 | 3 | 4 | 5] = g._count._all;
    ratingTotal += g._count._all;
    ratingSum += g.rating * g._count._all;
  }

  const toListItem = (r: {
    id: string;
    rating: number;
    authorName: string | null;
    comment: string | null;
    createdAt: Date;
    createdAtGoogle: Date | null;
    status?: string;
    lastError?: string | null;
    response?: { finalText: string } | null;
  }) => ({
    id: r.id,
    rating: r.rating,
    authorName: r.authorName,
    comment: r.comment,
    createdAt: reviewDate(r).toISOString(),
    ...(r.status
      ? { status: r.status, beforeAutomation: isBeforeAutomation({ status: r.status, createdAtGoogle: r.createdAtGoogle }, connectedAt) }
      : {}),
    ...(r.response?.finalText ? { replyText: r.response.finalText } : {}),
    ...(r.lastError ? { lastError: r.lastError } : {}),
  });

  return NextResponse.json({
    business: { id: business.id, name: business.name },
    rangeDays,
    automation: {
      enabled: business.autoResponderEnabled,
      googleConnected: Boolean(google),
      locationSelected: Boolean(business.googleLocationId),
      connectedAt: connectedAt?.toISOString() ?? null,
      billing: gate.allowed ? "ok" : gate.reason,
      lastSync: lastSync
        ? { status: lastSync.status, at: (lastSync.finishedAt ?? lastSync.startedAt).toISOString() }
        : null,
    },
    kpis: {
      averageRating: {
        current: average(current.map((r) => r.rating)),
        previous: average(previous.map((r) => r.rating)),
      },
      reviewsReceived: { current: current.length, previous: previous.length },
      repliesSent: { current: currentSent.length, previous: previousSent.length },
      avgResponseMinutes: { current: responseMinutes(currentSent), previous: responseMinutes(previousSent) },
    },
    series,
    bucket,
    ratings: {
      distribution: ratingDistribution,
      total: ratingTotal,
      average: ratingTotal > 0 ? ratingSum / ratingTotal : null,
      removed: removedCount,
    },
    attention: {
      draftsCount,
      drafts: drafts.map(toListItem),
      lowRatingCount,
      lowRating: lowRating.map(toListItem),
      failedCount,
    },
    recentReviews: recentReviews.map(toListItem),
  });
}
