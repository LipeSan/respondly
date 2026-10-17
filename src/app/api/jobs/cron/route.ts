import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoRespondBusiness } from "@/lib/reviewEngine";
import { syncReviewsForBusiness } from "@/lib/reviews/sync";
import { JobType } from "@prisma/client";
import { isJobRunningRecently } from "@/lib/jobLock";
import { blockedBillingStatuses, isActiveSubscriptionStatus } from "@/lib/plan";
import crypto from "crypto";

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is
  // set on the project. `x-cron-secret` / `?secret=` remain for manual runs.
  // (The old `x-vercel-cron` header bypass was dropped: any client can send it.)
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const header = req.headers.get("x-cron-secret");
  const query = url.searchParams.get("secret");

  const secret = process.env.CRON_SECRET;
  const provided = bearer ?? header ?? query ?? "";
  if (!secret || !provided || !timingSafeEqual(provided, secret)) return unauthorized();

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
      paymentHistory: {
        select: {
          status: true,
          stripeEventType: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
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
    const latestBillingEvent = b.paymentHistory?.[0] ?? null;
    const billingBlocked = latestBillingEvent ? blockedBillingStatuses.has(latestBillingEvent.status) : false;

    if (!isActiveSubscriptionStatus(subscriptionStatus) || billingBlocked) {
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
        reason: !isActiveSubscriptionStatus(subscriptionStatus)
          ? "subscription_inactive"
          : billingBlocked
            ? "billing_blocked"
            : "subscription_inactive",
        ...(billingBlocked
          ? {
              billing: {
                status: latestBillingEvent?.status ?? null,
                stripeEventType: latestBillingEvent?.stripeEventType ?? null,
                createdAt: latestBillingEvent?.createdAt ?? null,
              },
            }
          : null),
        ...(debug ? { debugReviews: await getDebugReviews(b.id) } : null),
      });
      continue;
    }

    // 1) Sync reviews
    let syncResult: SyncResult | null = null;
    const syncRunning = await isJobRunningRecently(b.id, JobType.sync_reviews, 120);
    
    if (!syncRunning) {
      try {
        const source = b.googleLocationId ? "google" : "mock";
        syncResult = await syncReviewsForBusiness(b.id, { source });
        totalSynced += syncResult?.imported ?? 0;
      } catch (e: unknown) {
        const msg = getErrorMessage(e);

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
        try {
            const r = await autoRespondBusiness(b.id);
            totalResponded += r.responded ?? 0;
            totalSkipped += r.skipped ?? 0;

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
