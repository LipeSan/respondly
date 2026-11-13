"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditFilter, AuditPage, AuditRow } from "@/lib/adminAudit";
import { formatAdminDateTime } from "@/lib/date";
import { Card, formatAuditAction, formatAuditDetails, formatRelative } from "../ui";
import { buildAuditHref } from "./href";

export function AuditCustomerSelect({
  filter,
  businessId,
  businesses,
}: {
  filter: AuditFilter;
  businessId: string | null;
  businesses: { id: string; name: string }[];
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="font-medium">Customer</span>
      <select
        value={businessId ?? ""}
        onChange={(e) => router.push(buildAuditHref(filter, e.target.value || null))}
        className="max-w-[16rem] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
      >
        <option value="">All customers</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AuditLogTable({
  initialPage,
  filter,
  businessId,
}: {
  initialPage: AuditPage;
  filter: AuditFilter;
  businessId: string | null;
}) {
  const [rows, setRows] = useState<AuditRow[]>(initialPage.rows);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter, cursor: nextCursor });
      if (businessId) params.set("business", businessId);
      const res = await fetch(`/api/admin/audit?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const page = (await res.json()) as AuditPage;
      setRows((prev) => [...prev, ...page.rows]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load more events");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [nextCursor, filter, businessId]);

  // Load the next 100 when the bottom of the list comes into view. Stops after
  // an error so it doesn't retry in a loop; the button below retries.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, nextCursor, error]);

  return (
    <div className="space-y-3">
      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">When</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3">By</th>
                <th scope="col" className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No audit events match these filters.</td>
                </tr>
              ) : (
                rows.map((log) => {
                  const details = formatAuditDetails(log.metadata);
                  return (
                    <tr key={log.id} className="align-top hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-6 py-3 text-gray-600" title={formatAdminDateTime(log.createdAt)}>
                        {formatRelative(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatAuditAction(log.action)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.targetBusiness ? (
                          <Link href={`/admin/businesses/${log.targetBusiness.id}`} className="hover:underline">
                            {log.targetBusiness.name}
                          </Link>
                        ) : (
                          log.targetUserEmail ?? "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.actor.name || log.actor.email}
                        <span className="text-gray-400"> · {log.actor.role}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{details || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div ref={sentinelRef} className="py-2 text-center text-sm text-gray-500" aria-live="polite">
        {error ? (
          <span>
            {error}.{" "}
            <button type="button" onClick={() => void loadMore()} className="font-semibold text-blue-600 hover:text-blue-500">
              Try again
            </button>
          </span>
        ) : loading ? (
          "Loading more…"
        ) : nextCursor ? null : rows.length > 0 ? (
          `All ${rows.length} events loaded.`
        ) : null}
      </div>
    </div>
  );
}
