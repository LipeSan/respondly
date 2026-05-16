import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoRespondBusiness } from "@/lib/reviewEngine";
import { syncReviewsForBusiness } from "@/lib/reviews/sync";
import { JobType } from "@prisma/client";
import { isJobRunningRecently } from "@/lib/jobLock";

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isActiveSubscriptionStatus(status: string | null | undefined) {
  if (!status) return false;
  return status === "active" || status === "trialing";
}

async function getDebugReviews(businessId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      businessId,
      status: { in: ["pending", "failed", "skipped"] },
    },
    select: {
      id: true,
      status: true,
      rating: true,
      source: true,
      externalId: true,
      createdAtGoogle: true,
      updatedAt: true,
      lastError: true,
      response: {
        select: {
          method: true,
          sentAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return reviews;
}

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const header = req.headers.get("x-cron-secret");
  const query = url.searchParams.get("secret");
  const provided = header ?? query ?? "";
  if (provided !== secret) return unauthorized();

  const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);

  // businesses with auto responder enabled
  const businesses = await prisma.business.findMany({
    where: { autoResponderEnabled: true },
    select: {
      id: true,
      name: true,
      googleLocationId: true,
      initialSyncCompleted: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          cancelAt: true,
        },
      },
    },
    take,
    orderBy: { createdAt: "desc" },
  });

  const results: Array<Record<string, unknown>> = [];
  let totalSynced = 0;
  let totalResponded = 0;
  let totalSkipped = 0;

  type SyncResult = Awaited<ReturnType<typeof syncReviewsForBusiness>>;

  for (const b of businesses) {
    const subscriptionStatus = b.subscription?.status ?? null;
    if (!isActiveSubscriptionStatus(subscriptionStatus)) {
      results.push({
        businessId: b.id,
        businessName: b.name,
        subscriptionSkipped: true,
        aiConfigured: Boolean(process.env.OPENAI_API_KEY),
        subscription: b.subscription
          ? {
              plan: b.subscription.plan,
              status: b.subscription.status,
              currentPeriodEnd: b.subscription.currentPeriodEnd,
              cancelAtPeriodEnd: b.subscription.cancelAtPeriodEnd,
              cancelAt: b.subscription.cancelAt,
            }
          : null,
        reason: "subscription_inactive",
        ...(debug ? { debugReviews: await getDebugReviews(b.id) } : null),
      });
      continue;
    }

    // 1) Sync reviews
    let syncResult: SyncResult | null = null;
    const syncRunning = await isJobRunningRecently(b.id, JobType.sync_reviews, 120);
    
    if (!syncRunning) {
      const job = await prisma.jobRun.create({
        data: {
          businessId: b.id,
          type: JobType.sync_reviews,
          status: "running",
        },
      });

      try {
        const source = b.googleLocationId ? "google" : "mock";
        syncResult = await syncReviewsForBusiness(b.id, { source });
        totalSynced += syncResult?.imported ?? 0;

        await prisma.jobRun.update({
          where: { id: job.id },
          data: {
            status: "success",
            finishedAt: new Date(),
            processed: (syncResult?.imported ?? 0) + (syncResult?.updated ?? 0),
          },
        });
      } catch (e: unknown) {
        const msg = getErrorMessage(e);
        await prisma.jobRun.update({
          where: { id: job.id },
          data: {
            status: "failed",
            finishedAt: new Date(),
            error: msg || "sync_failed",
          },
        });

        results.push({
          businessId: b.id,
          businessName: b.name,
          syncError: msg || "sync_failed",
          aiConfigured: Boolean(process.env.OPENAI_API_KEY),
          subscription: b.subscription
            ? {
                plan: b.subscription.plan,
                status: b.subscription.status,
                currentPeriodEnd: b.subscription.currentPeriodEnd,
                cancelAtPeriodEnd: b.subscription.cancelAtPeriodEnd,
                cancelAt: b.subscription.cancelAt,
              }
            : null,
          ...(debug ? { debugReviews: await getDebugReviews(b.id) } : null),
        });
        // even if sync fails, we can still try to respond to what already exists
      }
    } else {
        results.push({
            businessId: b.id,
            businessName: b.name,
            syncSkipped: true,
            reason: "sync_already_running",
            aiConfigured: Boolean(process.env.OPENAI_API_KEY),
            subscription: b.subscription
              ? {
                  plan: b.subscription.plan,
                  status: b.subscription.status,
                  currentPeriodEnd: b.subscription.currentPeriodEnd,
                  cancelAtPeriodEnd: b.subscription.cancelAtPeriodEnd,
                  cancelAt: b.subscription.cancelAt,
                }
              : null,
            ...(debug ? { debugReviews: await getDebugReviews(b.id) } : null),
        });
    }

    // 2) Auto responder
    const autoRunning = await isJobRunningRecently(b.id, JobType.auto_responder, 120);

    if (!autoRunning) {
        const job = await prisma.jobRun.create({
            data: {
                businessId: b.id,
                type: JobType.auto_responder,
                status: "running",
            }
        });

        try {
            const r = await autoRespondBusiness(b.id);
            totalResponded += r.responded ?? 0;
            totalSkipped += r.skipped ?? 0;

            await prisma.jobRun.update({
                where: { id: job.id },
                data: {
                    status: "success",
                    finishedAt: new Date(),
                    responded: r.responded,
                    skipped: r.skipped,
                }
            });

            results.push({
                businessId: b.id,
                businessName: b.name,
                sync: syncResult,
                auto: r,
                aiConfigured: Boolean(process.env.OPENAI_API_KEY),
                subscription: b.subscription
                  ? {
                      plan: b.subscription.plan,
                      status: b.subscription.status,
                      currentPeriodEnd: b.subscription.currentPeriodEnd,
                      cancelAtPeriodEnd: b.subscription.cancelAtPeriodEnd,
                      cancelAt: b.subscription.cancelAt,
                    }
                  : null,
                ...(debug ? { debugReviews: await getDebugReviews(b.id) } : null),
            });
        } catch (e: unknown) {
            const msg = getErrorMessage(e);
            await prisma.jobRun.update({
                where: { id: job.id },
                data: {
                    status: "failed",
                    finishedAt: new Date(),
                    error: msg || "auto_failed",
                }
            });

            results.push({
                businessId: b.id,
                businessName: b.name,
                sync: syncResult,
                autoError: msg || "auto_failed",
                aiConfigured: Boolean(process.env.OPENAI_API_KEY),
                subscription: b.subscription
                  ? {
                      plan: b.subscription.plan,
                      status: b.subscription.status,
                      currentPeriodEnd: b.subscription.currentPeriodEnd,
                      cancelAtPeriodEnd: b.subscription.cancelAtPeriodEnd,
                      cancelAt: b.subscription.cancelAt,
                    }
                  : null,
                ...(debug ? { debugReviews: await getDebugReviews(b.id) } : null),
            });
        }
    } else {
        results.push({
            businessId: b.id,
            businessName: b.name,
            autoSkipped: true,
            reason: "auto_already_running",
            aiConfigured: Boolean(process.env.OPENAI_API_KEY),
            subscription: b.subscription
              ? {
                  plan: b.subscription.plan,
                  status: b.subscription.status,
                  currentPeriodEnd: b.subscription.currentPeriodEnd,
                  cancelAtPeriodEnd: b.subscription.cancelAtPeriodEnd,
                  cancelAt: b.subscription.cancelAt,
                }
              : null,
            ...(debug ? { debugReviews: await getDebugReviews(b.id) } : null),
        });
    }
  }

  return NextResponse.json({
    ok: true,
    processedBusinesses: businesses.length,
    totalSynced,
    totalResponded,
    totalSkipped,
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
