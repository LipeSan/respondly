"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { Textarea } from "@/components/Textarea";
import { useToast } from "@/components/Toast";

type ReviewResponse = {
  id: string;
  finalText: string;
  method: "template" | "ai" | "manual";
  createdAt: string;
  sentAt?: string | null;
};

type Review = {
  id: string;
  source?: string;
  externalId?: string | null;
  rating: number;
  authorName?: string | null;
  comment?: string | null;
  status: "pending" | "responded" | "failed" | "skipped";
  createdAt: string;
  lastError?: string | null;
  responses?: ReviewResponse[];
};

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i <= n ? "fill-current text-yellow-400" : "text-gray-300"}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </div>
  );
}

function getStatusBadge(r: Review) {
  const hasDraft = Boolean(r.responses?.some((resp) => !resp.sentAt));
  if (r.status === "pending" && hasDraft) {
    return { label: "Draft", classes: "bg-blue-100 text-blue-800" };
  }
  if (r.status === "pending") return { label: "Pending", classes: "bg-yellow-100 text-yellow-800" };
  if (r.status === "responded") return { label: "Responded", classes: "bg-green-100 text-green-800" };
  if (r.status === "failed") return { label: "Failed", classes: "bg-red-100 text-red-800" };
  return { label: "Skipped", classes: "bg-gray-100 text-gray-800" };
}

export default function ReviewsPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<"all" | "pending" | "responded" | "failed" | "skipped">("all");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Review | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draftText, setDraftText] = useState("");

  const draftResponse = useMemo(() => {
    return detail?.responses?.find((r) => !r.sentAt) ?? null;
  }, [detail]);

  const counts = useMemo(() => {
    const c = { pending: 0, responded: 0, failed: 0, skipped: 0 };
    for (const r of items) c[r.status] = (c[r.status] as number) + 1;
    return c;
  }, [items]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews?status=${status}&take=100`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load reviews");
      setItems(data.reviews ?? []);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function openReview(id: string) {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/reviews/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load review");
      setDetail(data.review);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setDetailLoading(false);
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
      if (!res.ok) throw new Error(data?.error || "Failed to publish");
      showToast({ type: "success", message: "Reply published successfully." });
      await Promise.all([load(), openReview(detail.id)]);
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text variant="h1">Reviews</Text>
            <Text variant="subtitle" className="mt-2">
              Here you can see pending reviews and generated responses.
            </Text>
          </div>

          <div className="flex gap-2" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["pending", "responded", "failed", "skipped", "all"] as const).map((s) => (
            <button
              key={s}
              className={`rounded-full border px-4 py-2 transition-all ${
                status === s
                  ? "border-blue-600 bg-blue-600 text-white shadow-md"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setStatus(s)}
            >
              <span className="text-sm font-medium">
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}{" "}
                {s !== "all" && (
                  <span className={`ml-1 ${status === s ? "text-blue-100" : "text-gray-400"}`}>
                    {counts[s] ?? 0}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="grid grid-cols-12 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <div className="col-span-2"><Text variant="label">Stars</Text></div>
            <div className="col-span-2"><Text variant="label">Status</Text></div>
            <div className="col-span-3"><Text variant="label">Author</Text></div>
            <div className="col-span-5"><Text variant="label">Comment</Text></div>
          </div>

          {loading ? (
            <div className="p-6">
              <Text variant="body">Loading...</Text>
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <Text variant="body">No reviews found.</Text>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openReview(r.id)}
                  className="grid w-full grid-cols-12 items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="col-span-2">
                    <div>
                      <Stars n={r.rating} />
                    </div>
                    <Text variant="body" className="text-xs text-gray-500">{r.rating}/5</Text>
                  </div>

                  <div className="col-span-2">
                    {(() => {
                      const badge = getStatusBadge(r);
                      return (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}
                    >
                      {badge.label}
                    </span>
                      );
                    })()}
                    {r.lastError && (
                      <Text variant="error" className="mt-1 line-clamp-2 text-xs">{r.lastError}</Text>
                    )}
                  </div>

                  <div className="col-span-3">
                    <Text variant="body" className="font-medium text-gray-900">
                      {r.authorName ?? "—"}
                    </Text>
                    <Text variant="body" className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </Text>
                  </div>

                  <div className="col-span-5">
                    <Text variant="body" className="line-clamp-2 text-gray-700">
                      {r.comment ?? "— (no comment)"}
                    </Text>
                    {r.responses?.[0]?.finalText && (
                      <div className="mt-2 rounded bg-gray-50 p-2">
                        <Text variant="body" className="line-clamp-2 text-xs text-gray-600">
                          <span className="font-medium">Response:</span> {r.responses[0].finalText}
                        </Text>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal simple */}
        {openId && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <Text variant="h2" className="!text-lg">Review Details</Text>
                <Button
                  variant="outline"
                  className="!w-auto !py-1.5 !px-3 text-sm font-normal"
                  onClick={() => {
                    setOpenId(null);
                    setDetail(null);
                  }}
                >
                  Close
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {detailLoading ? (
                  <Text variant="body" className="text-gray-600">Loading details...</Text>
                ) : !detail ? (
                  <Text variant="body" className="text-gray-600">No data.</Text>
                ) : (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-900 flex items-center gap-2">
                          <span className="text-lg"><Stars n={detail.rating} /></span> <span className="text-sm text-gray-600">({detail.rating}/5)</span>
                        </div>
                        {(() => {
                          const badge = getStatusBadge(detail);
                          return (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="mt-4 space-y-2">
                        <div>
                          <Text variant="label" className="inline mr-2">Author:</Text>
                          <Text variant="body" className="inline text-gray-900">{detail.authorName ?? "—"}</Text>
                        </div>
                        <div>
                          <Text variant="label" className="block mb-1">Comment:</Text>
                          <Text variant="body" className="text-gray-700">{detail.comment ?? "—"}</Text>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-6">
                      <Text variant="subtitle" className="mb-4 font-semibold text-gray-900">Responses</Text>
                      {detail.responses?.length ? (
                        <div className="space-y-4">
                          {draftResponse && (
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                              <div className="flex items-center justify-between text-xs text-blue-800 mb-3">
                                <span className="font-medium uppercase tracking-wide">Draft</span>
                                <span>{new Date(draftResponse.createdAt).toLocaleString()}</span>
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
                              <div key={resp.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                  <span className="font-medium uppercase tracking-wide">Method: {resp.method}</span>
                                  <span>{new Date(resp.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                                  {resp.finalText}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <Text variant="body" className="text-gray-500 italic">No responses yet.</Text>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                {draftResponse && (
                  <Button className="!w-auto" onClick={publish} disabled={publishing || detailLoading || !draftText.trim()}>
                    {publishing ? "Publishing..." : "Approve & publish"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
