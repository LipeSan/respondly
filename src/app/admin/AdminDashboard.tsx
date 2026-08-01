"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  AdminCustomerCard,
  type AdminCustomerBusinessRow,
  type AdminCustomerRole,
} from "@/app/admin/AdminCustomerCard";
import { InlineNotification } from "@/components/InlineNotification";
import { Text } from "@/components/Text";
import { formatDate, formatDateTime } from "@/lib/date";

type OverviewResponse = {
  admin: {
    id: string;
    email: string;
    role: "user" | "support" | "admin";
    accessLevel: "support" | "admin";
  };
  summary: {
    usersCount: number;
    businessesCount: number;
    activeSubscriptionsCount: number;
    trialingSubscriptionsCount: number;
  };
  impersonatedBusinessId: string | null;
  businesses: AdminCustomerBusinessRow[];
  recentAuditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
    actorUser: {
      id: string;
      name: string | null;
      email: string;
      role: "user" | "support" | "admin";
    };
    targetUser: {
      id: string;
      name: string | null;
      email: string;
      role: "user" | "support" | "admin";
    } | null;
    targetBusiness: {
      id: string;
      name: string;
    } | null;
  }>;
};

type TrialInvite = {
  id: string;
  code: string;
  days: number;
  email: string | null;
  usedAt: string | null;
  usedByBusinessId: string | null;
  usedByBusiness: {
    id: string;
    name: string;
  } | null;
  _count: {
    redemptions: number;
  };
  createdAt: string;
};

export function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"customers" | "trial-invites" | "audit">("customers");
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AdminCustomerRole>>({});
  const [openCustomerActionsId, setOpenCustomerActionsId] = useState<string | null>(null);
  const [invites, setInvites] = useState<TrialInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    days: "90",
    email: "",
    code: "",
  });

  async function load(currentQuery = query) {
    setLoading(true);
    setError(null);
    try {
      const url = currentQuery.trim()
        ? `/api/admin/overview?q=${encodeURIComponent(currentQuery.trim())}`
        : "/api/admin/overview";
      const res = await fetch(url, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load admin overview");
      }
      const nextData = payload as OverviewResponse;
      setData(nextData);
      setRoleDrafts(
        Object.fromEntries(
          nextData.businesses.map((business) => [business.user.id, business.user.role])
        ) as Record<string, AdminCustomerRole>
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
  }, []);

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-customer-actions-menu]")) return;
      setOpenCustomerActionsId(null);
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenCustomerActionsId(null);
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, []);

  async function loadInvites() {
    setInvitesLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/trial-invites?take=100", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load trial invites");
      }
      setInvites((payload?.invites ?? []) as TrialInvite[]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
    } finally {
      setInvitesLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "trial-invites" && invites.length === 0 && !invitesLoading) {
      void loadInvites();
    }
  }, [activeTab]);

  const businesses = data?.businesses ?? [];
  const summaryCards = useMemo(
    () =>
      data
        ? [
            { label: "Users", value: data.summary.usersCount },
            { label: "Businesses", value: data.summary.businessesCount },
            { label: "Active", value: data.summary.activeSubscriptionsCount },
            { label: "Trialing", value: data.summary.trialingSubscriptionsCount },
          ]
        : [],
    [data]
  );

  async function openBusiness(businessId: string, destination: string) {
    setActionLoading(`${businessId}:${destination}`);
    setOpenCustomerActionsId(null);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/impersonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to start admin access");
      }
      router.push(destination);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function stopImpersonation() {
    setActionLoading("stop");
    setError(null);
    setNotice(null);
    try {
      await fetch("/api/admin/impersonation", { method: "DELETE" });
      await load(query);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function updateUserRole(userId: string) {
    const role = roleDrafts[userId];
    if (!role) return;
    setActionLoading(`role:${userId}`);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update role");
      }
      await load(query);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuery(draftQuery);
    void load(draftQuery);
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("create-invite");
    setError(null);
    setNotice(null);
    try {
      const body = {
        days: Number(inviteForm.days),
        ...(inviteForm.email.trim() ? { email: inviteForm.email.trim() } : {}),
        ...(inviteForm.code.trim() ? { code: inviteForm.code.trim().toUpperCase() } : {}),
      };
      const res = await fetch("/api/admin/trial-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to create invite");
      }
      setInviteForm({ days: inviteForm.days, email: "", code: "" });
      await loadInvites();
      setNotice("Trial invite created successfully.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function copyInviteCode(code: string) {
    setError(null);
    setNotice(null);
    try {
      await navigator.clipboard.writeText(code);
      setNotice(`Invite code ${code} copied.`);
    } catch {
      setError("Unable to copy invite code on this browser.");
    }
  }

  async function deleteInvite(id: string, code: string) {
    setActionLoading(`delete-invite:${id}`);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/trial-invites?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to remove invite");
      }
      await loadInvites();
      setNotice(`Invite ${code} removed.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {data?.impersonatedBusinessId ? (
        <InlineNotification tone="info">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Text variant="body" className="text-sm">
              Customer access is active. Existing app pages now operate in the selected business context.
            </Text>
            <Button
              type="button"
              variant="outline"
              className="!w-auto border-blue-200 bg-white px-3 py-2 text-blue-900 hover:bg-blue-100"
              onClick={stopImpersonation}
              isLoading={actionLoading === "stop"}
            >
              Stop customer access
            </Button>
          </div>
        </InlineNotification>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text variant="body" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {card.label}
            </Text>
            <Text variant="h2" className="mt-2">
              {card.value}
            </Text>
          </div>
        ))}
      </div>

      {data?.admin ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Text variant="body" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Admin access
          </Text>
          <Text variant="body" className="mt-2 text-sm text-gray-700">
            Signed in as {data.admin.email} with level <strong>{data.admin.accessLevel}</strong>.
          </Text>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === "customers"
              ? "bg-gray-900 text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Customers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("trial-invites")}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === "trial-invites"
              ? "bg-gray-900 text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Trial Invites
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === "audit"
              ? "bg-gray-900 text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Audit Logs
        </button>
      </div>

      {error ? <InlineNotification tone="error">{error}</InlineNotification> : null}

      {notice ? <InlineNotification tone="info">{notice}</InlineNotification> : null}

      {activeTab === "customers" ? (
        <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={onSearchSubmit}>
          <div className="flex-1">
            <Input
              id="adminSearch"
              name="adminSearch"
              label="Search customers"
              placeholder="Business name, customer email, or owner name"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-3">
            <Button type="submit" className="!w-auto px-5">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="!w-auto px-5"
              onClick={() => {
                setDraftQuery("");
                setQuery("");
                void load("");
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Loading admin data...
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            No customers found for this filter.
          </div>
        ) : (
          businesses.map((business) => {
            const isCurrent = data?.impersonatedBusinessId === business.id;
            return (
              <AdminCustomerCard
                key={business.id}
                business={business}
                isCurrent={isCurrent}
                accessLevel={data?.admin.accessLevel ?? "support"}
                roleDraft={roleDrafts[business.user.id] ?? business.user.role}
                actionLoading={actionLoading}
                isActionsOpen={openCustomerActionsId === business.id}
                onRoleChange={(role) =>
                  setRoleDrafts((current) => ({
                    ...current,
                    [business.user.id]: role,
                  }))
                }
                onSaveRole={() => updateUserRole(business.user.id)}
                onToggleActions={() =>
                  setOpenCustomerActionsId((current) =>
                    current === business.id ? null : business.id
                  )
                }
                onCloseActions={() => setOpenCustomerActionsId(null)}
                onOpenBusiness={(destination) => openBusiness(business.id, destination)}
              />
            );
          })
        )}
      </div>
        </>
      ) : null}

      {activeTab === "trial-invites" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <Text variant="h2" className="text-xl">
                Create Trial Invite
              </Text>
              <Text variant="body" className="mt-1 text-sm text-gray-600">
                Generate VIP trial codes that can be used by many customers, but only once per business.
              </Text>
            </div>
            <form className="grid gap-4 md:grid-cols-4" onSubmit={createInvite}>
              <div>
                <Input
                  id="inviteDays"
                  name="inviteDays"
                  label="Days"
                  placeholder="90"
                  value={inviteForm.days}
                  onChange={(e) => setInviteForm((current) => ({ ...current, days: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  id="inviteEmail"
                  name="inviteEmail"
                  label="Email (optional)"
                  placeholder="client@company.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((current) => ({ ...current, email: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  label="Custom code (optional)"
                  placeholder="VIP180"
                  value={inviteForm.code}
                  onChange={(e) => setInviteForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="!w-auto px-5"
                  isLoading={actionLoading === "create-invite"}
                >
                  Create invite
                </Button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <Text variant="h2" className="text-xl">
                Existing Invites
              </Text>
              <Text variant="body" className="mt-1 text-sm text-gray-600">
                Review active invite codes, the latest recorded usage, and how many businesses have redeemed each code.
              </Text>
            </div>

            <div className="space-y-3">
              {invitesLoading ? (
                <div className="text-sm text-gray-600">Loading invites...</div>
              ) : invites.length === 0 ? (
                <div className="text-sm text-gray-600">No trial invites created yet.</div>
              ) : (
                invites.map((invite) => (
                  <div key={invite.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Text variant="body" className="text-base font-semibold text-gray-900">
                            {invite.code}
                          </Text>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            Once per business
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                          <div>Days: {invite.days}</div>
                          <div>Email lock: {invite.email || "Open invite"}</div>
                          <div>Businesses used: {invite._count.redemptions}</div>
                          <div>Created: {formatDate(invite.createdAt)}</div>
                          <div>Last used at: {formatDate(invite.usedAt)}</div>
                          <div>Last used by: {invite.usedByBusiness?.name || invite.usedByBusinessId || "—"}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="!w-auto px-4 py-2"
                          onClick={() => copyInviteCode(invite.code)}
                        >
                          Copy code
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="!w-auto border-red-200 px-4 py-2 text-red-700 hover:bg-red-50"
                          isLoading={actionLoading === `delete-invite:${invite.id}`}
                          onClick={() => deleteInvite(invite.id, invite.code)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "audit" ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <Text variant="h2" className="text-xl">
              Recent Audit Logs
            </Text>
            <Text variant="body" className="mt-1 text-sm text-gray-600">
              Tracks impersonation sessions and administrative changes.
            </Text>
          </div>

          <div className="space-y-3">
            {(data?.recentAuditLogs ?? []).length === 0 ? (
              <div className="text-sm text-gray-600">No audit events yet.</div>
            ) : (
              (data?.recentAuditLogs ?? []).map((log) => (
                <div key={log.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Text variant="body" className="text-sm font-semibold text-gray-900">
                        {log.action}
                      </Text>
                      <Text variant="body" className="mt-1 text-sm text-gray-600">
                        {log.actorUser.name || log.actorUser.email} ({log.actorUser.role})
                      </Text>
                    </div>
                    <Text variant="body" className="text-xs text-gray-500">
                      {formatDateTime(log.createdAt)}
                    </Text>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <div>Target user: {log.targetUser ? `${log.targetUser.name || log.targetUser.email} (${log.targetUser.role})` : "—"}</div>
                    <div>Target business: {log.targetBusiness?.name || "—"}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
