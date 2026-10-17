import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { Prisma } from "@prisma/client";
import {
  automatedReviewsWhere,
  beforeAutomationWhere,
  isBeforeAutomation,
} from "@/lib/reviews/automationWindow";

type ReviewStatus = "pending" | "responded" | "failed" | "skipped";

const DEFAULT_TAKE = 50;
const MAX_TAKE = 100;

// Opaque keyset cursor: the sort key of the last review on the previous page.
// Keyset (not offset) pagination keeps pages stable when a sync inserts new
// reviews while the user is scrolling.
type Cursor = { d: string | null; id: string };

function encodeCursor(review: { createdAtGoogle: Date | null; id: string }) {
  const cursor: Cursor = { d: review.createdAtGoogle?.toISOString() ?? null, id: review.id };
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed?.id !== "string") return null;
    if (parsed.d !== null && (typeof parsed.d !== "string" || Number.isNaN(Date.parse(parsed.d)))) return null;
    return { d: parsed.d, id: parsed.id };
  } catch {
    return null;
  }
}

// Rows strictly after the cursor in `createdAtGoogle DESC NULLS LAST, id DESC` order.
function afterCursor(cursor: Cursor): Prisma.ReviewWhereInput {
  if (cursor.d === null) {
    return { createdAtGoogle: null, id: { lt: cursor.id } };
  }
  const d = new Date(cursor.d);
  return {
    OR: [
      { createdAtGoogle: { lt: d } },
      { createdAtGoogle: d, id: { lt: cursor.id } },
      { createdAtGoogle: null },
    ],
  };
}

async function getStatusCounts(businessId: string, connectedAt: Date | null) {
  const beforeWhere = beforeAutomationWhere(connectedAt);
  const [groups, beforeAutomation] = await Promise.all([
    prisma.review.groupBy({
      by: ["status"],
      where: { businessId },
      _count: { _all: true },
    }),
    beforeWhere
      ? prisma.review.count({ where: { businessId, status: "pending", ...beforeWhere } })
      : Promise.resolve(0),
  ]);
  const counts = { pending: 0, responded: 0, failed: 0, skipped: 0, before_automation: 0, all: 0 };
  for (const group of groups) {
    counts[group.status] = group._count._all;
    counts.all += group._count._all;
  }
  // Pending reviews older than connectedAt will never be answered, so they're
  // counted under their own filter instead of inflating "pending".
  counts.pending -= beforeAutomation;
  counts.before_automation = beforeAutomation;
  return counts;
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
  const status = url.searchParams.get("status"); // pending | responded | failed | skipped | before_automation | all
  const takeRaw = Number(url.searchParams.get("take") ?? DEFAULT_TAKE);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.floor(takeRaw), 1), MAX_TAKE) : DEFAULT_TAKE;

  const rawCursor = url.searchParams.get("cursor");
  const cursor = decodeCursor(rawCursor);
  if (rawCursor && !cursor) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const connectedAt = business.connectedAt;
  const filters: Prisma.ReviewWhereInput[] = [{ businessId: business.id }];
  if (status === "pending") {
    filters.push({ status: "pending" }, automatedReviewsWhere(connectedAt));
  } else if (status === "before_automation") {
    // Without connectedAt nothing predates automation, so the filter is empty.
    filters.push({ status: "pending" }, beforeAutomationWhere(connectedAt) ?? { id: { in: [] } });
  } else if (status && status !== "all") {
    const allowed: ReviewStatus[] = ["responded", "failed", "skipped"];
    if (allowed.includes(status as ReviewStatus)) {
      filters.push({ status: status as ReviewStatus });
    }
  }
  if (cursor) filters.push(afterCursor(cursor));

  const [reviews, counts] = await Promise.all([
    prisma.review.findMany({
      where: { AND: filters },
      orderBy: [{ createdAtGoogle: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      // One extra row tells us whether another page exists.
      take: take + 1,
      include: {
        response: true,
      },
    }),
    // Counts only change the filter chips, so they're sent with the first page only.
    cursor ? Promise.resolve(null) : getStatusCounts(business.id, connectedAt),
  ]);

  const hasMore = reviews.length > take;
  const page = hasMore ? reviews.slice(0, take) : reviews;

  const shaped = page.map((r) => ({
    ...r,
    responses: r.response ? [r.response] : [],
    response: undefined,
    beforeAutomation: isBeforeAutomation(r, connectedAt),
  }));

  return NextResponse.json({
    reviews: shaped,
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
    counts,
    automationStartsAt: connectedAt?.toISOString() ?? null,
  });
}
