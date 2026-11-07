import { NextResponse } from "next/server";
import { JobType } from "@prisma/client";
import { getCurrentAdminUser, recordAdminAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { isJobRunningRecently } from "@/lib/jobLock";
import { syncReviewsForBusiness } from "@/lib/reviews/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pulls a business's reviews from Google right now. Sync only: unlike the
 * daily cron, it never runs the auto-responder, so nothing is published.
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (adminContext.accessLevel !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const business = await prisma.business.findUnique({ where: { id }, select: { id: true, googleLocationId: true } });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (!business.googleLocationId) {
    return NextResponse.json({ error: "This business has no Google location connected" }, { status: 400 });
  }
  if (await isJobRunningRecently(business.id, JobType.sync_reviews)) {
    return NextResponse.json({ error: "A sync is already running for this business" }, { status: 409 });
  }

  try {
    const result = await syncReviewsForBusiness(business.id, { source: "google" });
    await recordAdminAudit({
      actorUserId: adminContext.user.id,
      action: "reviews_synced",
      targetBusinessId: business.id,
      metadata: {
        imported: result.imported,
        updated: result.updated,
        removed: result.removed,
        removalGuarded: result.removalGuarded,
        totalFetched: result.totalFetched,
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync failed" }, { status: 500 });
  }
}
