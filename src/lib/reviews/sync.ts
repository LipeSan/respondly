import { prisma } from "@/lib/db";
import { fetchMockReviews } from "@/lib/reviews/providers/mock";
import { fetchGoogleReviews } from "@/lib/reviews/providers/google";
import type { ExternalReview } from "@/lib/reviews/providers/mock";
import { finishJobFailed, finishJobSuccess, startJob } from "../jobs";
import { generateInsightInBackground } from "@/lib/insights/trigger";
import { JobType, Prisma } from "@prisma/client";

function toReviewData(r: ExternalReview) {
    return {
        rating: Math.max(1, Math.min(5, Math.round(r.rating))),
        authorName: r.authorName ?? null,
        comment: r.comment ?? null,
        createdAtGoogle: r.createdAtGoogle ?? null,
    };
}

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

        // Dedupe by externalId so one review never lands in both the create and update batches
        const incoming = new Map<string, ExternalReview>();
        for (const r of fetched) if (r.source === source) incoming.set(r.externalId, r);

        // One query for what we already have, instead of an upsert per review
        const existing = await prisma.review.findMany({
            where: { businessId, source, externalId: { in: [...incoming.keys()] } },
            select: { id: true, externalId: true, rating: true, authorName: true, comment: true, createdAtGoogle: true },
        });
        const existingById = new Map(existing.map((e) => [e.externalId, e]));

        const toCreate: Prisma.ReviewCreateManyInput[] = [];
        const toUpdate: { id: string; data: ReturnType<typeof toReviewData> }[] = [];

        for (const r of incoming.values()) {
            const data = toReviewData(r);
            const current = existingById.get(r.externalId);

            if (!current) {
                toCreate.push({ businessId, source, externalId: r.externalId, status: "pending", ...data });
            } else if (
                current.rating !== data.rating ||
                current.authorName !== data.authorName ||
                current.comment !== data.comment ||
                current.createdAtGoogle?.getTime() !== data.createdAtGoogle?.getTime()
            ) {
                toUpdate.push({ id: current.id, data });
            }
            // Unchanged reviews are not written, so their updatedAt stays meaningful
        }

        // skipDuplicates covers a concurrent sync inserting the same review first
        // (relies on @@unique([businessId, source, externalId]))
        const { count: imported } = toCreate.length
            ? await prisma.review.createMany({ data: toCreate, skipDuplicates: true })
            : { count: 0 };

        if (toUpdate.length) {
            await prisma.$transaction(
                toUpdate.map((u) => prisma.review.update({ where: { id: u.id }, data: u.data }))
            );
        }
        const updated = toUpdate.length;

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

            // Reviews are in now: first insights report if they already pay.
            generateInsightInBackground(businessId, "first_sync");
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
