import { prisma } from "@/lib/db";
import { startJob, finishJobSuccess, finishJobFailed } from "@/lib/jobs";
import { getBusinessPlan } from "@/lib/plan";
import { JobType, Prisma } from "@prisma/client";
import { isReportDue, startOfUtcDay } from "@/lib/insights/schedule";
import {
  FIRST_INSIGHT_WINDOW_MONTHS,
  MAX_MONTHLY_WINDOW_DAYS,
  MIN_COMMENTS_FOR_INSIGHT,
  canUseInsights,
  modelInsightResultSchema,
  type InsightItem,
  type ModelInsightItem,
} from "@/lib/insights/schema";

// Caps keep the prompt bounded for businesses with a lot of reviews.
const MAX_REVIEWS_IN_PROMPT = 300;
const MAX_COMMENT_CHARS = 600;
const MIN_STRENGTH_RATING = 4;

function subtractMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() - months);
  return r;
}

const SYSTEM_PROMPT = `You analyze customer reviews for a local business and report what is working and what could improve.

Rules:
- Return JSON: { "strengths": InsightItem[], "improvements": InsightItem[] }, at most 3 items each, most mentioned first.
- InsightItem: { "theme": string, "title": string, "summary": string, "matchingIds": string[], "quoteIds": string[], "suggestion": string }
- "strengths" are things customers praise. "improvements" are things customers complain about. A topic belongs to only one list.
- "theme" is a short, generic snake_case key for the topic, the most conventional name for it (e.g. "wait_time", "staff_friendliness", "coffee_quality", "food_quality", "cleanliness", "pricing", "parking", "atmosphere"). The same topic must always get the same key, so reports can be compared month to month.
- Find topics from the reviews themselves. Report every topic that 2 or more reviews mention, up to 3 per list. Fewer than 3 is fine; never invent a pattern to fill the list.
- "matchingIds" lists EVERY review id (e.g. "r12") whose text talks about this topic. Go through all reviews; do not include reviews that are about something else.
- "quoteIds" lists up to 3 ids from "matchingIds" whose text best shows the pattern on its own.
- "summary" is one or two sentences. "suggestion" is one concrete action for the owner (for strengths: how to keep or promote it).
- Write in English, plain and specific. No generic advice.`;

export type InsightReview = { id: string; rating: number; comment: string; date: Date | null };

// Last month's themes are deliberately not sent: given that list, the model
// anchors on it and skips new topics. Conventional keys keep trends matching.
export async function callInsightModel(args: { reviews: InsightReview[] }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // Short ids save tokens and let us reject anything the model makes up.
  const lines = args.reviews.map((r, i) => {
    const date = r.date ? r.date.toISOString().slice(0, 10) : "unknown";
    return `r${i + 1} | ${r.rating}★ | ${date} | ${r.comment.slice(0, MAX_COMMENT_CHARS).replace(/\s+/g, " ")}`;
  });

  const user = ["Reviews (id | rating | date | text):", ...lines].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      // matchingIds can list many ids for large windows.
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || "AI request failed";
    throw new Error(String(msg));
  }

  const choice = data?.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("AI insight was cut off before finishing");

  let raw: unknown;
  try {
    raw = JSON.parse(String(choice?.message?.content ?? ""));
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const parsed = modelInsightResultSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`AI returned an unexpected shape: ${parsed.error.message}`);

  const lookup = (refs: string[]) => [
    ...new Set(
      refs
        .map((ref) => args.reviews[Number(ref.replace(/^r/, "")) - 1])
        .filter((r): r is InsightReview => Boolean(r))
    ),
  ];

  // Map short ids back to real reviews, compute counts from the actual
  // ratings, and drop patterns without at least two real reviews behind them.
  const resolve = (items: ModelInsightItem[]): InsightItem[] =>
    items
      .map((item) => {
        const matching = lookup(item.matchingIds);
        const quotes = lookup(item.quoteIds).filter((r) => matching.includes(r));
        const avg = matching.length ? matching.reduce((sum, r) => sum + r.rating, 0) / matching.length : null;
        return {
          theme: item.theme,
          title: item.title,
          summary: item.summary,
          mentions: matching.length,
          avgRating: avg === null ? null : Math.round(avg * 10) / 10,
          reviewIds: (quotes.length ? quotes : matching).slice(0, 3).map((r) => r.id),
          suggestion: item.suggestion,
        };
      })
      .filter((item) => item.mentions >= 2)
      .sort((a, b) => b.mentions - a.mentions);

  // Guard against the model filing a complaint as a strength: a strength
  // needs good ratings, and a theme can only appear in one list.
  const improvements = resolve(parsed.data.improvements);
  const improvementThemes = new Set(improvements.map((i) => i.theme));
  const strengths = resolve(parsed.data.strengths).filter(
    (i) => !improvementThemes.has(i.theme) && (i.avgRating ?? 0) >= MIN_STRENGTH_RATING
  );

  return { model, strengths, improvements };
}

export async function isInsightDue(businessId: string, now = new Date()) {
  const latest = await prisma.reviewInsight.findFirst({
    where: { businessId, status: { in: ["ready", "insufficient_data"] } },
    orderBy: { periodEnd: "desc" },
    select: { periodEnd: true },
  });
  return isReportDue(latest?.periodEnd ?? null, now);
}

/**
 * The first report covers the last FIRST_INSIGHT_WINDOW_MONTHS months. Each
 * one after it starts where the previous report ended, so every review is
 * counted in exactly one monthly report, capped at MAX_MONTHLY_WINDOW_DAYS.
 * A report regenerated for the same day keeps its own start.
 */
async function getPeriodStart(businessId: string, periodEnd: Date) {
  const previous = await prisma.reviewInsight.findFirst({
    where: { businessId, status: { in: ["ready", "insufficient_data"] }, periodEnd: { lt: periodEnd } },
    orderBy: { periodEnd: "desc" },
    select: { periodEnd: true },
  });
  if (!previous) return subtractMonths(periodEnd, FIRST_INSIGHT_WINDOW_MONTHS);

  const earliest = new Date(periodEnd.getTime() - MAX_MONTHLY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return previous.periodEnd > earliest ? previous.periodEnd : earliest;
}

/**
 * Generates (or regenerates for today) the review insight for one business.
 * The paid-plan gate lives here so every entry point respects it.
 */
export async function generateReviewInsight(businessId: string, now = new Date()) {
  const plan = await getBusinessPlan(businessId);
  if (!canUseInsights(plan.plan)) return { skipped: true as const, reason: "plan_not_eligible" };

  const periodEnd = startOfUtcDay(now);
  const periodStart = await getPeriodStart(businessId, periodEnd);

  const job = await startJob(businessId, JobType.review_insights);

  try {
    const where: Prisma.ReviewWhereInput = {
      businessId,
      createdAtGoogle: { gte: periodStart, lt: periodEnd },
    };

    const [stats, commented] = await Promise.all([
      prisma.review.aggregate({ where, _count: { _all: true }, _avg: { rating: true } }),
      prisma.review.findMany({
        where: { ...where, comment: { not: null } },
        select: { id: true, rating: true, comment: true, createdAtGoogle: true },
        orderBy: { createdAtGoogle: "desc" },
        take: MAX_REVIEWS_IN_PROMPT,
      }),
    ]);

    const reviews: InsightReview[] = commented
      .map((r) => ({ id: r.id, rating: r.rating, comment: (r.comment ?? "").trim(), date: r.createdAtGoogle }))
      .filter((r) => r.comment.length > 0);

    const base = {
      periodStart,
      periodEnd,
      reviewCount: stats._count._all,
      commentCount: reviews.length,
      avgRating: stats._avg.rating,
    };

    let data: Omit<Prisma.ReviewInsightUncheckedCreateInput, "businessId">;

    if (reviews.length < MIN_COMMENTS_FOR_INSIGHT) {
      data = { ...base, status: "insufficient_data", strengths: Prisma.DbNull, improvements: Prisma.DbNull };
    } else {
      const result = await callInsightModel({ reviews });
      data = {
        ...base,
        status: "ready",
        strengths: result.strengths,
        improvements: result.improvements,
        model: result.model,
      };
    }

    const insight = await prisma.reviewInsight.upsert({
      where: { businessId_periodEnd: { businessId, periodEnd } },
      create: { businessId, ...data },
      update: { ...data, error: null },
    });

    await finishJobSuccess(job.id, { processed: reviews.length });
    return { skipped: false as const, insightId: insight.id, status: insight.status };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "insight_failed";

    await prisma.reviewInsight.upsert({
      where: { businessId_periodEnd: { businessId, periodEnd } },
      create: { businessId, periodStart, periodEnd, status: "failed", error: message },
      // Keep an insight already generated today; only record the error.
      update: { error: message },
    });
    await finishJobFailed(job.id, message);
    throw e;
  }
}
