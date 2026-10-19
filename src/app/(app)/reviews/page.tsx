"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Text } from "@/components/Text";
import { Textarea } from "@/components/Textarea";
import { useToast } from "@/components/Toast";
import { InlineNotification } from "@/components/InlineNotification";
import { formatDate, formatDateTime } from "@/lib/date";

type ReviewResponse = {
  id: string;
  finalText: string;
  method: "template" | "ai" | "manual";
  createdAt: string;
  sentAt?: string | null;
};

type ReviewStatus = "pending" | "responded" | "failed" | "skipped";
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

type Review = {
  id: string;
  source?: string;
  externalId?: string | null;
  rating: number;
  authorName?: string | null;
  comment?: string | null;
  status: ReviewStatus;
  createdAt: string;
  createdAtGoogle?: string | null;
  lastError?: string | null;
  beforeAutomation?: boolean;
  responses?: ReviewResponse[];
};

function getFilterBucket(r: Review): Exclude<StatusFilter, "all"> {
  return r.beforeAutomation ? "before_automation" : r.status;
}

function Stars({ n, size = "h-3.5 w-3.5" }: { n: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`${size} ${i <= n ? "text-yellow-400" : "text-gray-200"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function getStatusBadge(r: Review) {
  if (r.beforeAutomation) {
    return { label: "Not automated", classes: "bg-gray-100 text-gray-600" };
  }
  const hasDraft = Boolean(r.responses?.some((resp) => !resp.sentAt));
  if (r.status === "pending" && hasDraft) {
    return { label: "Draft", classes: "bg-blue-100 text-blue-800" };
  }
  if (r.status === "pending") return { label: "Pending", classes: "bg-yellow-100 text-yellow-800" };
  if (r.status === "responded") return { label: "Responded", classes: "bg-green-100 text-green-800" };
  if (r.status === "failed") return { label: "Failed", classes: "bg-red-100 text-red-800" };
  return { label: "Skipped", classes: "bg-gray-100 text-gray-800" };
}

function StatusBadge({ review }: { review: Review }) {
  const badge = getStatusBadge(review);
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>{badge.label}</span>;
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
  const { showToast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Review[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [counts, setCounts] = useState<StatusCounts>(emptyCounts);
  const [automationStartsAt, setAutomationStartsAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Review | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draftText, setDraftText] = useState("");

  // Aborts the in-flight list request when the filter changes, so a slow
  // response for the old filter can't be merged into the new list.
  const listRequestRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const draftResponse = useMemo(() => {
    return detail?.responses?.find((r) => !r.sentAt) ?? null;
  }, [detail]);

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

  async function openReview(id: string) {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/reviews/${id}`, { cache: "no-store" });
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
      if (!res.ok) throw new Error(data?.error || "Failed to load review");
      setDetail(data.review);
      return data.review as Review;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setDetailLoading(false);
    }
    return null;
  }

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

  async function publish() {
    if (!detail) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${detail.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalText: draftText }),
      });
      const data = await res.json().catch(() => ({}));
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
      if (!res.ok) throw new Error(data?.error || "Failed to publish");
      showToast({ type: "success", message: "Reply published successfully." });
      const updated = await openReview(detail.id);
      if (updated) applyUpdatedReview(detail, updated);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
      showToast({ type: "error", message: errorMessage });
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    if (draftResponse?.finalText) setDraftText(draftResponse.finalText);
    else setDraftText("");
  }, [draftResponse?.id]);

  useEffect(() => {
    if (!openId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openId]);

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
    if (reviewId) void openReview(reviewId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function closeReview() {
    setOpenId(null);
    setDetail(null);
  }

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
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openReview(r.id)}
                  className="group flex w-full items-start justify-between gap-4 rounded-xl px-3 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars n={r.rating} />
                      <span className="text-sm font-medium text-gray-900">{r.authorName || "Anonymous"}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(r.createdAtGoogle ?? r.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{r.comment || "No comment, rating only."}</p>
                    {r.responses?.[0]?.finalText ? (
                      <p className="mt-2 line-clamp-2 border-l-2 border-gray-200 pl-3 text-sm text-gray-500">
                        {r.responses[0].finalText}
                      </p>
                    ) : null}
                    {r.lastError ? <p className="mt-2 line-clamp-2 text-xs text-red-600">{r.lastError}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge review={r} />
                    <svg
                      className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
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

        {openId && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 py-8 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeReview();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-dialog-title"
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 id="review-dialog-title" className="text-base font-semibold text-gray-900">Review details</h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeReview}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {detailLoading ? (
                  <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading review">
                    <div className="h-4 w-40 rounded bg-gray-100" />
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-3/4 rounded bg-gray-100" />
                    <div className="mt-6 h-24 rounded-xl bg-gray-100" />
                  </div>
                ) : !detail ? (
                  <p className="text-sm text-gray-500">Couldn&apos;t load this review.</p>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Stars n={detail.rating} size="h-4 w-4" />
                            <span className="text-sm text-gray-500 tabular-nums">{detail.rating}/5</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-gray-900">{detail.authorName || "Anonymous"}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(detail.createdAtGoogle ?? detail.createdAt)}</p>
                        </div>
                        <StatusBadge review={detail} />
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {detail.comment || "No comment, rating only."}
                      </p>
                      {detail.beforeAutomation && automationStartsAt ? (
                        <p className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                          This review was posted before automatic replies started on {formatDate(automationStartsAt)}, so
                          it won&apos;t be answered automatically.
                        </p>
                      ) : null}
                      {detail.lastError ? (
                        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{detail.lastError}</p>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Replies</p>
                      {detail.responses?.length ? (
                        <div className="mt-3 space-y-3">
                          {draftResponse && (
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                              <div className="mb-3 flex items-center justify-between text-xs">
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">Draft</span>
                                <span className="text-blue-800/70">{formatDateTime(draftResponse.createdAt)}</span>
                              </div>
                              <Textarea
                                label="Message"
                                rows={6}
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                              />
                            </div>
                          )}

                          {detail.responses
                            .filter((resp) => resp.id !== draftResponse?.id)
                            .map((resp) => (
                              <div key={resp.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="mb-2 flex items-center justify-between text-xs">
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium capitalize text-gray-700">
                                    {resp.method === "ai" ? "AI" : resp.method}
                                  </span>
                                  <span className="text-gray-400">{formatDateTime(resp.createdAt)}</span>
                                </div>
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{resp.finalText}</div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                          No replies yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {draftResponse ? (
                <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                  <Button variant="ghost" className="!w-auto px-4 py-2" onClick={closeReview}>
                    Cancel
                  </Button>
                  <Button
                    className="!w-auto px-4 py-2"
                    onClick={publish}
                    disabled={publishing || detailLoading || !draftText.trim()}
                  >
                    {publishing ? "Publishing..." : "Approve & publish"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
