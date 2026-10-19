"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Stars } from "@/components/ReviewRow";
import { Textarea } from "@/components/Textarea";
import { useToast } from "@/components/Toast";
import { formatDate, formatDateTime } from "@/lib/date";

export type ReviewResponse = {
  id: string;
  finalText: string;
  method: "template" | "ai" | "manual";
  createdAt: string;
  sentAt?: string | null;
};

export type ReviewStatus = "pending" | "responded" | "failed" | "skipped";

export type Review = {
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

export function getStatusBadge(r: Review) {
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

export function StatusBadge({ review }: { review: Review }) {
  const badge = getStatusBadge(review);
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>{badge.label}</span>;
}

// Review details popup: loads the review, shows its replies, and lets the
// owner edit and publish a pending draft. Shared by the Dashboard and Reviews.
export function ReviewDetailModal({
  reviewId,
  automationStartsAt,
  onClose,
  onPublished,
}: {
  reviewId: string | null;
  automationStartsAt?: string | null;
  onClose: () => void;
  onPublished?: (previous: Review, updated: Review) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<Review | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [draftText, setDraftText] = useState("");

  const draftResponse = useMemo(() => {
    return detail?.responses?.find((r) => !r.sentAt) ?? null;
  }, [detail]);

  async function loadReview(id: string) {
    setDetailLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/reviews/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        router.refresh();
        return null;
      }
      if (data?.code === "NO_BUSINESS") {
        router.push("/onboarding");
        router.refresh();
        return null;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to load review");
      setDetail(data.review);
      return data.review as Review;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setDetailLoading(false);
    }
    return null;
  }

  async function publish() {
    if (!detail) return;
    setPublishing(true);
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
      const updated = await loadReview(detail.id);
      if (updated) onPublished?.(detail, updated);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      showToast({ type: "error", message: errorMessage });
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    setDetail(null);
    if (reviewId) void loadReview(reviewId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  useEffect(() => {
    if (draftResponse?.finalText) setDraftText(draftResponse.finalText);
    else setDraftText("");
  }, [draftResponse?.id]);

  useEffect(() => {
    if (!reviewId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [reviewId]);

  if (!reviewId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
            onClick={onClose}
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
            <p className="text-sm text-gray-500">{loadError ?? "Couldn't load this review."}</p>
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
            <Button variant="ghost" className="!w-auto px-4 py-2" onClick={onClose}>
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
  );
}
