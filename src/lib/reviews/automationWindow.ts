import type { Prisma } from "@prisma/client";

// Automation only answers reviews posted on Google at or after `connectedAt`
// (set on the first sync after connecting Google). Shared by the review engine
// and the reviews API so the list never disagrees with what actually gets answered.

/** Reviews the auto-responder is allowed to answer. */
export function automatedReviewsWhere(connectedAt: Date | null): Prisma.ReviewWhereInput {
  if (!connectedAt) return {};
  return {
    OR: [
      { createdAtGoogle: { gte: connectedAt } },
      { createdAtGoogle: null }, // allows mocks
    ],
  };
}

/** Reviews posted before automation started; they are never answered automatically. */
export function beforeAutomationWhere(connectedAt: Date | null): Prisma.ReviewWhereInput | null {
  if (!connectedAt) return null;
  return { createdAtGoogle: { lt: connectedAt } };
}

export function isBeforeAutomation(
  review: { status: string; createdAtGoogle: Date | null },
  connectedAt: Date | null
) {
  return (
    review.status === "pending" &&
    Boolean(connectedAt && review.createdAtGoogle && review.createdAtGoogle < connectedAt)
  );
}
