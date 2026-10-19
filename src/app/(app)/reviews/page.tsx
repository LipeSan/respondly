"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ReviewRow } from "@/components/ReviewRow";
import { ReviewDetailModal, StatusBadge, type Review, type ReviewStatus } from "@/components/ReviewDetailModal";
import { Text } from "@/components/Text";
import { InlineNotification } from "@/components/InlineNotification";
import { formatDate } from "@/lib/date";

// "before_automation" is not a stored status: it's a pending review posted on
// Google before the business connected, which automation never answers.
type StatusFilter = ReviewStatus | "before_automation" | "all";
type StatusCounts = Record<StatusFilter, number>;

const PAGE_SIZE = 50;
const emptyCounts: StatusCounts = {
  pending: 0,
  responded: 0,
  failed: 0,
  skipped: 0,
  before_automation: 0,
  all: 0,
};
const filterOptions: StatusFilter[] = ["pending", "responded", "failed", "skipped", "before_automation", "all"];
const filterLabels: Record<StatusFilter, string> = {
  pending: "Pending",
  responded: "Responded",
  failed: "Failed",
  skipped: "Skipped",
  before_automation: "Before automation",
  all: "All",
};

function getFilterBucket(r: Review): Exclude<StatusFilter, "all"> {
  return r.beforeAutomation ? "before_automation" : r.status;
}

function ReviewsSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-gray-100" aria-busy="true" aria-label="Loading reviews">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="px-3 py-4">
          <div className="h-3.5 w-48 rounded bg-gray-100" />
          <div className="mt-3 h-3 w-full rounded bg-gray-100" />
          <div className="mt-2 h-3 w-2/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Review[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [counts, setCounts] = useState<StatusCounts>(emptyCounts);
  const [automationStartsAt, setAutomationStartsAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);

  // Aborts the in-flight list request when the filter changes, so a slow
  // response for the old filter can't be merged into the new list.
  const listRequestRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (cursor: string | null) => {
      listRequestRef.current?.abort();
      const controller = new AbortController();
      listRequestRef.current = controller;

      if (cursor) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ status, take: String(PAGE_SIZE) });
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/reviews?${params}`, { cache: "no-store", signal: controller.signal });
        const data = await res.json();
        if (res.status === 401) {
          router.push("/login");
          router.refresh();
          return;
        }
        if (data?.code === "NO_BUSINESS") {
          router.push("/onboarding");
          router.refresh();
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Failed to load reviews");

        const page: Review[] = data.reviews ?? [];
        if (cursor) {
          setItems((current) => {
            const seen = new Set(current.map((r) => r.id));
            return [...current, ...page.filter((r) => !seen.has(r.id))];
          });
        } else {
          setItems(page);
        }
        if (data.counts) setCounts(data.counts);
        if (!cursor) setAutomationStartsAt(data.automationStartsAt ?? null);
        setNextCursor(data.nextCursor ?? null);
      } catch (e) {
        if (controller.signal.aborted) return;
        const errorMessage = e instanceof Error ? e.message : "Unexpected error";
        setError(errorMessage);
      } finally {
        if (listRequestRef.current === controller) {
          listRequestRef.current = null;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [router, status]
  );

  const loadMore = useCallback(() => {
    if (!nextCursor || loading || loadingMore || error) return;
    void loadPage(nextCursor);
  }, [error, loadPage, loading, loadingMore, nextCursor]);

  // Applies a review's new state to the loaded list without refetching every
  // page: it's dropped if it no longer matches the active filter.
  function applyUpdatedReview(previous: Review, updated: Review) {
    const previousBucket = getFilterBucket(previous);
    const updatedBucket = getFilterBucket(updated);
    setItems((current) =>
      status !== "all" && updatedBucket !== status
        ? current.filter((r) => r.id !== updated.id)
        : current.map((r) => (r.id === updated.id ? updated : r))
    );
    if (previousBucket !== updatedBucket) {
      setCounts((current) => ({
        ...current,
        [previousBucket]: Math.max(0, current[previousBucket] - 1),
        [updatedBucket]: current[updatedBucket] + 1,
      }));
    }
  }

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    void loadPage(null);
    return () => listRequestRef.current?.abort();
  }, [loadPage]);

  // Deep links from the dashboard: ?status=<filter> preselects a tab and
  // ?open=<reviewId> opens that review.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialStatus = params.get("status");
    if (initialStatus && (filterOptions as string[]).includes(initialStatus)) {
      setStatus(initialStatus as StatusFilter);
    }
    const reviewId = params.get("open");
    if (reviewId) setOpenId(reviewId);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  return (
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div>
            <Text variant="h1">Reviews</Text>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">
              Every Google review and the reply it got.
            </p>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label="Filter by status">
              {filterOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    status === s ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {filterLabels[s]}
                  <span className={`ml-1.5 tabular-nums ${status === s ? "text-gray-300" : "text-gray-400"}`}>
                    {counts[s] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {automationStartsAt && counts.before_automation > 0 ? (
          <InlineNotification tone="info">
            Automatic replies started on <strong>{formatDate(automationStartsAt)}</strong>, when you connected
            Google. {counts.before_automation === 1 ? "1 review" : `${counts.before_automation} reviews`} posted
            before that date won&apos;t be answered automatically. You&apos;ll find them under{" "}
            <button
              type="button"
              className="font-semibold underline underline-offset-2 hover:no-underline"
              onClick={() => setStatus("before_automation")}
            >
              Before automation
            </button>
            .
          </InlineNotification>
        ) : null}

        {error ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <Button variant="outline" className="!w-auto bg-white px-4 py-2" onClick={() => loadPage(null)}>
              Try again
            </Button>
          </div>
        ) : null}

        <Card className="!p-3 sm:!p-4">
          {loading ? (
            <ReviewsSkeleton />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-16 text-center">
              <p className="text-sm font-medium text-gray-700">No reviews here</p>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                {status === "all"
                  ? "New Google reviews will show up here as soon as they're synced."
                  : `There are no ${filterLabels[status].toLowerCase()} reviews right now.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((r) => (
                <ReviewRow
                  key={r.id}
                  review={{
                    rating: r.rating,
                    authorName: r.authorName,
                    comment: r.comment,
                    createdAt: r.createdAtGoogle ?? r.createdAt,
                    replyText: r.responses?.[0]?.finalText,
                    lastError: r.lastError,
                  }}
                  badge={<StatusBadge review={r} />}
                  onClick={() => setOpenId(r.id)}
                />
              ))}
            </div>
          )}

          {!loading && items.length > 0 ? (
            <div className="mt-2 border-t border-gray-100 px-3 pt-4 pb-1 text-center">
              {nextCursor ? (
                <>
                  <div ref={sentinelRef} aria-hidden="true" />
                  <Button
                    type="button"
                    variant="outline"
                    className="!w-auto px-5 py-2"
                    isLoading={loadingMore}
                    onClick={() => {
                      setError(null);
                      void loadPage(nextCursor);
                    }}
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-gray-400">
                  {items.length === 1 ? "That's the only review." : `That's all ${items.length} reviews.`}
                </p>
              )}
            </div>
          ) : null}
        </Card>

        <ReviewDetailModal
          reviewId={openId}
          automationStartsAt={automationStartsAt}
          onClose={() => setOpenId(null)}
          onPublished={applyUpdatedReview}
        />
      </main>
    </div>
  );
}
