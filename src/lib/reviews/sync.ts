import { prisma } from "@/lib/db";
import { fetchMockReviews } from "@/lib/reviews/providers/mock";
import { fetchGoogleReviews } from "@/lib/reviews/providers/google";
import type { ExternalReview } from "@/lib/reviews/providers/mock";
import { finishJobFailed, finishJobSuccess, startJob } from "../jobs";
import { generateInsightInBackground } from "@/lib/insights/trigger";
import { JobType, Prisma } from "@prisma/client";

// A full fetch missing more than this share of our live reviews looks like an
// API hiccup rather than real deletions, so nothing is marked removed.
const MAX_REMOVED_SHARE = 0.3;
const MIN_REMOVED_GUARD = 5;

/**
 * Marks Google reviews that the (complete) fetch no longer returns as removed.
 * Called only after every page was fetched, since fetchGoogleReviews throws on
 * any failed page.
 */
async function markRemovedReviews(businessId: string, incomingIds: Set<string>) {
    // An empty answer is far more likely a glitch than every review deleted.
    if (incomingIds.size === 0) return { removed: 0, guarded: true };

    const live = await prisma.review.findMany({
        where: { businessId, source: "google", removedAt: null },
        select: { id: true, externalId: true },
    });
    const missing = live.filter((r) => !r.externalId || !incomingIds.has(r.externalId));
    if (missing.length === 0) return { removed: 0, guarded: false };

    if (missing.length > Math.max(MIN_REMOVED_GUARD, Math.ceil(live.length * MAX_REMOVED_SHARE))) {
        console.warn(
            `[sync] ${businessId}: ${missing.length}/${live.length} reviews missing from Google, not marking them removed`
        );
        return { removed: 0, guarded: true };
    }

    const { count } = await prisma.review.updateMany({
        where: { id: { in: missing.map((r) => r.id) }, removedAt: null },
        data: { removedAt: new Date() },
    });
    return { removed: count, guarded: false };
}

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

        // Mock reviews are a dev aid only: in production they would mark the
        // business as synced and feed auto-replies and insights with fake data.
        if (source === "mock" && process.env.VERCEL_ENV === "production") {
            throw new Error("Google is not connected");
        }
        if (source === "google" && !biz.googleLocationId) {
            throw new Error("Google is not connected");
        }

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
            select: { id: true, externalId: true, rating: true, authorName: true, comment: true, createdAtGoogle: true, removedAt: true },
        });
        const existingById = new Map(existing.map((e) => [e.externalId, e]));

        const toCreate: Prisma.ReviewCreateManyInput[] = [];
        const toUpdate: { id: string; data: ReturnType<typeof toReviewData> & { removedAt?: null } }[] = [];

        for (const r of incoming.values()) {
            const data = toReviewData(r);
            const current = existingById.get(r.externalId);

            if (!current) {
                toCreate.push({ businessId, source, externalId: r.externalId, status: "pending", ...data });
            } else if (
                current.removedAt !== null ||
                current.rating !== data.rating ||
                current.authorName !== data.authorName ||
                current.comment !== data.comment ||
                current.createdAtGoogle?.getTime() !== data.createdAtGoogle?.getTime()
            ) {
                // A review Google returns again is no longer removed
                toUpdate.push({ id: current.id, data: current.removedAt ? { ...data, removedAt: null } : data });
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

        const removal = source === "google"
            ? await markRemovedReviews(businessId, new Set(incoming.keys()))
            : { removed: 0, guarded: false };

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
            removed: removal.removed,
            removalGuarded: removal.guarded,
            totalFetched: fetched.length,
            connectedAtSet,
        };

    } catch (e) {
        const message = e instanceof Error ? e.message : "Sync failed";
        await finishJobFailed(job.id, message);
        throw e instanceof Error ? e : new Error(message);
    }
}
