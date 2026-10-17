"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InlineNotification } from "@/components/InlineNotification";
import { AdminSendEmailModal, type AdminEmailRecipient } from "@/app/admin/AdminSendEmailModal";
import { onboardingStageLabels, type OnboardingStage } from "@/lib/email/adminEmailPresets";
import { Badge, HealthDot, formatRelative, planBadge, type HealthLevel } from "@/app/admin/ui";

type CustomerRow = {
  id: string;
  name: string;
  createdAt: string;
  owner: { id: string; name: string | null; email: string; role: "user" | "support" | "admin"; lastEmailSentAt: string | null };
  subscription: { plan: string; status: string; trialEndsAt: string | null } | null;
  autoResponderEnabled: boolean;
  lastSync: { status: "success" | "failed"; at: string } | null;
  reviewCount: number;
  health: HealthLevel;
  issues: Array<{ code: string; severity: "critical" | "warning"; label: string }>;
  stage: OnboardingStage;
};

type IncompleteUserRow = { id: string; name: string | null; email: string; createdAt: string; lastEmailSentAt: string | null };

type CustomersResponse = {
  admin: { accessLevel: "support" | "admin" };
  impersonatedBusinessId: string | null;
  customers: CustomerRow[];
  incompleteUsers: IncompleteUserRow[];
};

export type CustomerFilter = "all" | "attention" | "active" | "trial" | "canceled" | "incomplete";

const filters: Array<{ key: CustomerFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "active", label: "Active" },
  { key: "trial", label: "Trial" },
  { key: "canceled", label: "Canceled / no plan" },
  { key: "incomplete", label: "Incomplete signups" },
];

export type SortKey = "customer" | "plan" | "health" | "lastSync" | "autoReplies" | "reviews" | "created";
export type SortDir = "asc" | "desc";

const healthRank: Record<HealthLevel, number> = { critical: 2, warning: 1, healthy: 0 };

function planRank(row: CustomerRow) {
  const sub = row.subscription;
  if (!sub) return 0;
  const tier = sub.plan === "pro" ? 2 : 1;
  if (sub.status === "active") return 10 + tier;
  if (sub.status === "trialing") return 6 + tier;
  if (sub.status === "past_due") return 4;
  return 1; // canceled / other
}

// Returns the value a column sorts by; null always sorts last, whatever the direction.
function sortValue(row: CustomerRow, key: SortKey): string | number | null {
  switch (key) {
    case "customer":
      return row.name.toLocaleLowerCase();
    case "plan":
      return planRank(row);
    case "health":
      return healthRank[row.health] * 100 + row.issues.length;
    case "lastSync":
      return row.lastSync ? new Date(row.lastSync.at).getTime() : null;
    case "autoReplies":
      return row.autoResponderEnabled ? 1 : 0;
    case "reviews":
      return row.reviewCount;
    case "created":
      return new Date(row.createdAt).getTime();
  }
}

/** First click direction per column: text A→Z, everything else biggest/most urgent first. */
const defaultDir: Record<SortKey, SortDir> = {
  customer: "asc",
  plan: "desc",
  health: "desc",
  lastSync: "desc",
  autoReplies: "desc",
  reviews: "desc",
  created: "desc",
};

function sortRows(rows: CustomerRow[], key: SortKey, dir: SortDir) {
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    // Stable tie-break: newest business first.
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function SortableHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (column: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === column;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-gray-900 ${
          active ? "text-gray-900" : ""
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <span
          aria-hidden="true"
          className={`text-[10px] ${active ? "text-gray-900" : "text-gray-300 group-hover:text-gray-400"}`}
        >
          {active ? (sortDir === "asc" ? "▲" : "▼") : "▲▼"}
        </span>
      </button>
    </th>
  );
}

function matchesFilter(row: CustomerRow, filter: CustomerFilter) {
  const status = row.subscription?.status;
  switch (filter) {
    case "attention":
      return row.issues.length > 0;
    case "active":
      return status === "active";
    case "trial":
      return status === "trialing";
    case "canceled":
      return !status || status === "canceled";
    case "incomplete":
      return row.stage !== "complete";
    default:
      return true;
  }
}

export function AdminCustomersTable({
  initialFilter,
  initialSort,
}: {
  initialFilter: CustomerFilter;
  initialSort: { key: SortKey; dir: SortDir };
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<CustomerFilter>(initialFilter);
  const [sort, setSort] = useState(initialSort);
  const [showInternal, setShowInternal] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [emailRecipient, setEmailRecipient] = useState<AdminEmailRecipient | null>(null);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`, { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.push("/dashboard");
          return;
        }
        if (!res.ok) throw new Error(payload?.error || "Failed to load customers");
        setData(payload as CustomersResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void load(submittedQuery);
  }, [load, submittedQuery]);

  // Keep filter and sort in the URL so links (e.g. from the overview) land on the right view.
  function syncUrl(nextFilter: CustomerFilter, nextSort: { key: SortKey; dir: SortDir }) {
    const params = new URLSearchParams();
    if (nextFilter !== "all") params.set("filter", nextFilter);
    if (nextSort.key !== "created") params.set("sort", `${nextSort.key}:${nextSort.dir}`);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/admin/customers?${query}` : "/admin/customers");
  }

  function selectFilter(next: CustomerFilter) {
    setFilter(next);
    syncUrl(next, sort);
  }

  function toggleSort(column: SortKey) {
    const next =
      sort.key === column
        ? { key: column, dir: sort.dir === "asc" ? ("desc" as const) : ("asc" as const) }
        : { key: column, dir: defaultDir[column] };
    setSort(next);
    syncUrl(filter, next);
  }

  // Businesses owned by staff (admin/support) are internal test accounts. They're
  // hidden by default so counts match the overview, which only counts customers.
  const allBusinesses = useMemo(() => data?.customers ?? [], [data]);
  const internalCount = useMemo(() => allBusinesses.filter((c) => c.owner.role !== "user").length, [allBusinesses]);
  const customers = useMemo(
    () => (showInternal ? allBusinesses : allBusinesses.filter((c) => c.owner.role === "user")),
    [allBusinesses, showInternal]
  );
  const incompleteUsers = useMemo(() => data?.incompleteUsers ?? [], [data]);
  const canSendEmail = data?.admin.accessLevel === "admin";

  const counts = useMemo(() => {
    const result = {} as Record<CustomerFilter, number>;
    for (const f of filters) result[f.key] = customers.filter((c) => matchesFilter(c, f.key)).length;
    result.incomplete += incompleteUsers.length;
    return result;
  }, [customers, incompleteUsers]);

  const visible = useMemo(
    () => sortRows(customers.filter((c) => matchesFilter(c, filter)), sort.key, sort.dir),
    [customers, filter, sort]
  );
  const showIncompleteUsers = filter === "incomplete" || filter === "all";

  async function openAsCustomer(businessId: string) {
    setOpeningId(businessId);
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to open customer account");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setOpeningId(null);
    }
  }

  function onEmailSent(recipient: AdminEmailRecipient, sentAt: string) {
    setEmailRecipient(null);
    setNotice(`Email sent to ${recipient.email}.`);
    setData((current) =>
      current
        ? {
            ...current,
            customers: current.customers.map((c) =>
              c.owner.id === recipient.userId ? { ...c, owner: { ...c.owner, lastEmailSentAt: sentAt } } : c
            ),
            incompleteUsers: current.incompleteUsers.map((u) =>
              u.id === recipient.userId ? { ...u, lastEmailSentAt: sentAt } : u
            ),
          }
        : current
    );
  }

  const actionButton =
    "inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter customers">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => selectFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${filter === f.key ? "text-gray-300" : "text-gray-400"}`}>
                {data ? counts[f.key] : "·"}
              </span>
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedQuery(query.trim());
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search business, name or email"
            aria-label="Search customers"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:w-72"
          />
          {submittedQuery ? (
            <button
              type="button"
              className={actionButton}
              onClick={() => {
                setQuery("");
                setSubmittedQuery("");
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
      </div>

      <div className="-mt-1 flex justify-end">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInternal}
            onChange={(e) => setShowInternal(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-gray-900 focus:ring-blue-500"
          />
          Show internal accounts{data ? ` (${internalCount})` : ""}
        </label>
      </div>

      {error ? <InlineNotification tone="error">{error}</InlineNotification> : null}
      {notice ? <InlineNotification tone="success">{notice}</InlineNotification> : null}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <SortableHeader label="Customer" column="customer" sortKey={sort.key} sortDir={sort.dir} onSort={toggleSort} />
                <SortableHeader label="Plan" column="plan" sortKey={sort.key} sortDir={sort.dir} onSort={toggleSort} />
                <SortableHeader label="Health" column="health" sortKey={sort.key} sortDir={sort.dir} onSort={toggleSort} />
                <SortableHeader label="Last sync" column="lastSync" sortKey={sort.key} sortDir={sort.dir} onSort={toggleSort} />
                <SortableHeader label="Auto-replies" column="autoReplies" sortKey={sort.key} sortDir={sort.dir} onSort={toggleSort} />
                <SortableHeader
                  label="Reviews"
                  column="reviews"
                  sortKey={sort.key}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  align="right"
                />
                <th scope="col" className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 ${loading && data ? "opacity-60" : ""}`}>
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">Loading customers...</td>
                </tr>
              ) : null}

              {visible.map((c) => {
                const plan = planBadge(c.subscription?.plan, c.subscription?.status);
                const topIssue = c.issues.find((i) => i.severity === "critical") ?? c.issues[0];
                const isCurrent = data?.impersonatedBusinessId === c.id;
                return (
                  <tr key={c.id} className="align-top transition-colors hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/businesses/${c.id}`} className="font-semibold text-gray-900 hover:underline">
                        {c.name}
                      </Link>
                      {isCurrent ? <span className="ml-2"><Badge tone="blue">Open now</Badge></span> : null}
                      {c.owner.role !== "user" ? <span className="ml-2"><Badge>Internal</Badge></span> : null}
                      <p className="mt-0.5 text-xs text-gray-500">
                        {c.owner.name ? `${c.owner.name} · ` : ""}
                        {c.owner.email}
                        {c.owner.role !== "user" ? ` · ${c.owner.role}` : ""}
                      </p>
                      {c.owner.lastEmailSentAt ? (
                        <p className="mt-0.5 text-xs text-gray-400">Emailed {formatRelative(c.owner.lastEmailSentAt)}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={plan.tone}>{plan.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-1">
                          <HealthDot level={c.health} title={c.issues.map((i) => i.label).join(", ") || "Healthy"} />
                        </span>
                        <span className={topIssue ? "text-gray-700" : "text-gray-500"}>
                          {topIssue ? topIssue.label : "Healthy"}
                          {c.issues.length > 1 ? <span className="text-gray-400"> +{c.issues.length - 1}</span> : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={c.lastSync?.status === "failed" ? "text-red-600" : "text-gray-600"}>
                        {c.lastSync ? formatRelative(c.lastSync.at) : "Never"}
                        {c.lastSync?.status === "failed" ? " · failed" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.autoResponderEnabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{c.reviewCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {canSendEmail ? (
                          <button
                            type="button"
                            className={actionButton}
                            onClick={() =>
                              setEmailRecipient({ userId: c.owner.id, name: c.owner.name, email: c.owner.email, stage: c.stage })
                            }
                          >
                            Email
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={actionButton}
                          disabled={openingId === c.id}
                          onClick={() => openAsCustomer(c.id)}
                        >
                          {openingId === c.id ? "Opening..." : "Open"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {showIncompleteUsers
                ? incompleteUsers.map((u) => (
                    <tr key={`user:${u.id}`} className="align-top transition-colors hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{u.name || u.email}</span>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {u.email} · signed up {formatRelative(u.createdAt)}
                        </p>
                        {u.lastEmailSentAt ? (
                          <p className="mt-0.5 text-xs text-gray-400">Emailed {formatRelative(u.lastEmailSentAt)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>No business</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="mt-1">
                            <HealthDot level="warning" />
                          </span>
                          <span className="text-gray-700">{onboardingStageLabels.no_business}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">—</td>
                      <td className="px-4 py-3 text-gray-400">—</td>
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {canSendEmail ? (
                            <button
                              type="button"
                              className={actionButton}
                              onClick={() =>
                                setEmailRecipient({ userId: u.id, name: u.name, email: u.email, stage: "no_business" })
                              }
                            >
                              Email
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                : null}

              {data && visible.length === 0 && !(showIncompleteUsers && incompleteUsers.length > 0) ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    {submittedQuery ? `No customers match "${submittedQuery}".` : "No customers in this view."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <AdminSendEmailModal recipient={emailRecipient} onClose={() => setEmailRecipient(null)} onSent={onEmailSent} />
    </div>
  );
}
