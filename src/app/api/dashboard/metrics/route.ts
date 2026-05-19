import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";

type ReviewStatus = "pending" | "responded" | "failed" | "skipped";
type ResponseMethod = "template" | "ai" | "manual";

function clampRangeDays(v: unknown) {
  const n = Number(v);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

function toDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfDayUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, days: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

export async function GET(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: business.id },
    select: {
      plan: true,
      status: true,
      createdAt: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      cancelAt: true,
    },
  });

  const url = new URL(req.url);
  const rangeDays = clampRangeDays(url.searchParams.get("range"));

  const today = startOfDayUtc(new Date());
  const start = addDaysUtc(today, -(rangeDays - 1));

  const reviews = await prisma.review.findMany({
    where: {
      businessId: business.id,
      OR: [{ createdAt: { gte: start } }, { createdAtGoogle: { gte: start } }],
    },
    select: {
      id: true,
      rating: true,
      status: true,
      authorName: true,
      comment: true,
      createdAt: true,
      createdAtGoogle: true,
      response: {
        select: {
          method: true,
          createdAt: true,
          sentAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const days = Array.from({ length: rangeDays }, (_, i) => {
    const d = addDaysUtc(start, i);
    return { key: toDayKey(d), date: d };
  });

  const dayMap = new Map<
    string,
    {
      total: number;
      ratingSum: number;
      status: Record<ReviewStatus, number>;
      drafted: number;
    }
  >(
    days.map((d) => [
      d.key,
      {
        total: 0,
        ratingSum: 0,
        status: { pending: 0, responded: 0, failed: 0, skipped: 0 },
        drafted: 0,
      },
    ])
  );

  let totalReviews = 0;
  let ratingSum = 0;
  const statusTotals: Record<ReviewStatus, number> = {
    pending: 0,
    responded: 0,
    failed: 0,
    skipped: 0,
  };

  const methodTotals: Record<ResponseMethod, number> = {
    template: 0,
    ai: 0,
    manual: 0,
  };

  let responseTimeCount = 0;
  let responseTimeMinutesSum = 0;
  let draftsAwaitingApprovalTotal = 0;
  let pendingWithoutDraftTotal = 0;

  const lowRatingOpen: Array<{
    id: string;
    rating: number;
    authorName: string | null;
    comment: string | null;
    status: ReviewStatus;
    createdAt: string;
  }> = [];

  const draftsAwaitingApproval: Array<{
    id: string;
    rating: number;
    authorName: string | null;
    comment: string | null;
    createdAt: string;
    method: ResponseMethod;
    draftCreatedAt: string;
  }> = [];

  for (const r of reviews) {
    const created = r.createdAtGoogle ?? r.createdAt;
    const dayKey = toDayKey(startOfDayUtc(created));
    const bucket = dayMap.get(dayKey);
    if (!bucket) continue;

    totalReviews += 1;
    ratingSum += r.rating;

    const status = r.status as ReviewStatus;
    statusTotals[status] += 1;
    bucket.total += 1;
    bucket.ratingSum += r.rating;
    bucket.status[status] += 1;

    if (r.response?.method) {
      const method = r.response.method as ResponseMethod;
      if (methodTotals[method] !== undefined) {
        methodTotals[method] += 1;
      }
      const diffMs = r.response.createdAt.getTime() - created.getTime();
      const diffMinutes = diffMs / 60000;
      if (Number.isFinite(diffMinutes) && diffMinutes >= 0) {
        responseTimeCount += 1;
        responseTimeMinutesSum += diffMinutes;
      }
    }

    const isDraft = status === "pending" && Boolean(r.response?.method) && !r.response?.sentAt;

    if (isDraft) {
      draftsAwaitingApprovalTotal += 1;
      bucket.drafted += 1;
      if (draftsAwaitingApproval.length < 5 && r.response?.method) {
        draftsAwaitingApproval.push({
          id: r.id,
          rating: r.rating,
          authorName: r.authorName ?? null,
          comment: r.comment ?? null,
          createdAt: created.toISOString(),
          method: r.response.method,
          draftCreatedAt: r.response.createdAt.toISOString(),
        });
      }
    }

    if ((r.status === "pending" || r.status === "failed") && r.rating <= 2) {
      if (lowRatingOpen.length < 5) {
        lowRatingOpen.push({
          id: r.id,
          rating: r.rating,
          authorName: r.authorName ?? null,
          comment: r.comment ?? null,
          status,
          createdAt: created.toISOString(),
        });
      }
    }
  }

  const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;
  const respondedCount = statusTotals.responded;
  const responseRate = totalReviews > 0 ? respondedCount / totalReviews : 0;
  pendingWithoutDraftTotal = Math.max(0, statusTotals.pending - draftsAwaitingApprovalTotal);

  const avgResponseTimeMinutes =
    responseTimeCount > 0 ? responseTimeMinutesSum / responseTimeCount : null;

  const series = days.map((d) => {
    const b = dayMap.get(d.key)!;
    const avg = b.total > 0 ? b.ratingSum / b.total : null;
    return {
      day: d.key,
      total: b.total,
      avgRating: avg,
      status: b.status,
      drafted: b.drafted,
    };
  });

  return NextResponse.json({
    business: { id: business.id, name: business.name, createdAt: business.createdAt.toISOString() },
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          createdAt: subscription.createdAt.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd
            ? subscription.currentPeriodEnd.toISOString()
            : null,
          cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
          cancelAt: subscription.cancelAt ? subscription.cancelAt.toISOString() : null,
        }
      : null,
    rangeDays,
    totals: {
      totalReviews,
      averageRating,
      responseRate,
      avgResponseTimeMinutes,
      status: statusTotals,
      methods: methodTotals,
      draftsAwaitingApproval: draftsAwaitingApprovalTotal,
      pendingWithoutDraft: pendingWithoutDraftTotal,
    },
    series,
    lowRatingOpen,
    draftsAwaitingApproval,
  });
}
