import { prisma } from "@/lib/db";
import { fetchMockReviews } from "@/lib/reviews/providers/mock";
import { fetchGoogleReviews } from "@/lib/reviews/providers/google";
import type { ExternalReview } from "@/lib/reviews/providers/mock";
import { finishJobFailed, finishJobSuccess, startJob } from "../jobs";
import { JobType } from "@prisma/client";

export async function syncReviewsForBusiness(
    businessId: string,
    opts?: { source?: "google" | "mock" }
) {
    const job = await startJob(businessId, JobType.sync_reviews);
    try {
        const biz = await prisma.business.findUnique({
            where: { id: businessId },
            select: {
                id: true,
                initialSyncCompleted: true,
                connectedAt: true,
                googleLocationId: true,
            },
        });
        if (!biz) throw new Error("Business not found");

        const source: "google" | "mock" =
            opts?.source ?? (biz.googleLocationId ? "google" : "mock");

        let fetched: ExternalReview[] = [];
        if (source === "google") fetched = await fetchGoogleReviews(businessId);
        else fetched = await fetchMockReviews();

        const firstSync = !biz.initialSyncCompleted;

        let imported = 0;
        let updated = 0;

        for (const r of fetched) {
            // Upsert ensures consistency and prevents duplicates (race conditions)
            // Requires @@unique([businessId, source, externalId]) in the schema
            const data = {
                rating: Math.max(1, Math.min(5, Math.round(r.rating))),
                authorName: r.authorName ?? null,
                comment: r.comment ?? null,
                createdAtGoogle: r.createdAtGoogle ?? null,
            };

            const res = await prisma.review.upsert({
                where: {
                    businessId_source_externalId: {
                        businessId,
                        source: r.source,
                        externalId: r.externalId,
                    },
                },
                create: {
                    businessId,
                    source: r.source,
                    externalId: r.externalId,
                    status: "pending",
                    ...data,
                },
                update: data,
            });

            // Simple heuristic: if updatedAt is very close to createdAt (on create they are the same)
            // In practice, upsert updates updatedAt.
            // For an exact count we'd need a findUnique before upsert, which becomes a double N+1.
            // We'll assume this is good enough.
            if (res.createdAt.getTime() === res.updatedAt.getTime()) {
                imported++;
            } else {
                updated++;
            }
        }

        // ✅ First sync: lock history by setting connectedAt=now
        let connectedAtSet: string | null = null;

        if (firstSync) {
            const now = new Date();
            const connectedAt = biz.connectedAt ?? now;

            await prisma.business.update({
                where: { id: businessId },
                data: {
                    initialSyncCompleted: true,
                    connectedAt,
                },
            });

            connectedAtSet = connectedAt.toISOString();
        }

        await finishJobSuccess(job.id, {
            processed: fetched.length,
        });

        return {
            ok: true,
            source,
            firstSync,
            imported,
            updated,
            totalFetched: fetched.length,
            connectedAtSet,
        };

    } catch (e) {
        const message = e instanceof Error ? e.message : "Sync failed";
        await finishJobFailed(job.id, message);
        throw e instanceof Error ? e : new Error(message);
    }
}
