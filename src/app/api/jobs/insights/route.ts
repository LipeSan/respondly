import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { JobType } from "@prisma/client";
import { isJobRunningRecently } from "@/lib/jobLock";
import { generateReviewInsight, isInsightDue } from "@/lib/insights/generate";
import crypto from "crypto";

export const maxDuration = 300;

// Stop picking up new businesses after this so the run finishes inside
// maxDuration; whatever is left is picked up by the next daily run.
const TIME_BUDGET_MS = 240_000;

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function handle(req: Request) {
  const url = new URL(req.url);
  // Same auth as /api/jobs/cron: Vercel Cron bearer, or x-cron-secret / ?secret= for manual runs.
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const header = req.headers.get("x-cron-secret");
  const query = url.searchParams.get("secret");

  const secret = process.env.CRON_SECRET;
  const provided = bearer ?? header ?? query ?? "";
  if (!secret || !provided || !timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const take = Math.min(Number(url.searchParams.get("take") ?? 20), 100);
  // ?businessId= forces a run for one business (still plan-gated), e.g. for testing.
  const onlyBusinessId = url.searchParams.get("businessId");
  const startedAt = Date.now();

  // Paid plans only; generateReviewInsight re-checks billing state itself.
  const businesses = await prisma.business.findMany({
    where: {
      ...(onlyBusinessId ? { id: onlyBusinessId } : null),
      initialSyncCompleted: true,
      subscription: { status: { in: ["active", "trialing"] } },
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const results: Array<Record<string, unknown>> = [];
  let generated = 0;

  for (const b of businesses) {
    if (generated >= take || Date.now() - startedAt > TIME_BUDGET_MS) break;
    if (!onlyBusinessId && !(await isInsightDue(b.id))) continue;
    if (await isJobRunningRecently(b.id, JobType.review_insights, 300)) {
      results.push({ businessId: b.id, businessName: b.name, skipped: true, reason: "already_running" });
      continue;
    }

    try {
      const r = await generateReviewInsight(b.id);
      if (!r.skipped) generated += 1;
      results.push({ businessId: b.id, businessName: b.name, ...r });
    } catch (e: unknown) {
      generated += 1;
      results.push({ businessId: b.id, businessName: b.name, error: getErrorMessage(e) || "insight_failed" });
    }
  }

  return NextResponse.json({
    ok: true,
    eligibleBusinesses: businesses.length,
    generated,
    results,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
