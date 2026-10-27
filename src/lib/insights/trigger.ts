import { after } from "next/server";
import { JobType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isJobRunningRecently } from "@/lib/jobLock";
import { generateReviewInsight, isInsightDue } from "@/lib/insights/generate";

/**
 * Generates the first report (last 3 months) as soon as a business is both
 * paying and synced, instead of waiting for the daily cron. Called from both
 * ends because they can happen in either order: checkout completed, and the
 * first review sync. Runs after the response is sent, so neither the Stripe
 * webhook nor the Google connect flow waits on the AI call.
 *
 * Best effort: anything skipped or failed here is picked up by the cron.
 */
export function generateInsightInBackground(businessId: string, source: "checkout" | "first_sync") {
  try {
    after(async () => {
      try {
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { initialSyncCompleted: true },
        });
        // Checkout before Google connect: the first sync will call this again.
        if (!business?.initialSyncCompleted) return;
        // Also covers re-subscribing after a lapse; a current report is kept.
        if (!(await isInsightDue(businessId))) return;
        if (await isJobRunningRecently(businessId, JobType.review_insights, 300)) return;

        // Plan / billing gate is enforced inside generateReviewInsight.
        const result = await generateReviewInsight(businessId);
        console.log("[insights] generated on", source, { businessId, ...result });
      } catch (e) {
        console.error("[insights] background generation failed", { businessId, source, error: e });
      }
    });
  } catch {
    // Outside a request (e.g. a script): leave it to the daily cron.
  }
}
