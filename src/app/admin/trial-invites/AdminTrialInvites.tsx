"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { InlineNotification } from "@/components/InlineNotification";
import { formatAdminDate } from "@/lib/date";
import { Badge, Card, CardHeader } from "@/app/admin/ui";

type TrialInvite = {
  id: string;
  code: string;
  days: number;
  email: string | null;
  usedAt: string | null;
  usedByBusinessId: string | null;
  usedByBusiness: { id: string; name: string } | null;
  _count: { redemptions: number };
  createdAt: string;
};

export function AdminTrialInvites() {
  const router = useRouter();
  const [invites, setInvites] = useState<TrialInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ days: "90", email: "", code: "" });

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/trial-invites?take=100", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/dashboard");
        return;
      }
      if (!res.ok) throw new Error(payload?.error || "Failed to load trial invites");
      setInvites((payload?.invites ?? []) as TrialInvite[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("create");
    setError(null);
    setNotice(null);
    try {
      const body = {
        days: Number(form.days),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.code.trim() ? { code: form.code.trim().toUpperCase() } : {}),
      };
      const res = await fetch("/api/admin/trial-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to create invite");
      setForm((current) => ({ days: current.days, email: "", code: "" }));
      await loadInvites();
      setNotice("Trial invite created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setActionLoading(null);
    }
  }

  async function copyCode(code: string) {
    setError(null);
    setNotice(null);
    try {
      await navigator.clipboard.writeText(code);
      setNotice(`Invite code ${code} copied.`);
    } catch {
      setError("Unable to copy the invite code in this browser.");
    }
  }

  async function removeInvite(id: string, code: string) {
    setActionLoading(`delete:${id}`);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/trial-invites?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to remove invite");
      await loadInvites();
      setNotice(`Invite ${code} removed.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <InlineNotification tone="error">{error}</InlineNotification> : null}
      {notice ? <InlineNotification tone="success">{notice}</InlineNotification> : null}

      <Card>
        <CardHeader
          title="Create invite"
          subtitle="VIP trial codes can be used by many customers, but only once per business."
        />
        <form className="mt-4 grid gap-4 md:grid-cols-[120px_1fr_1fr_auto]" onSubmit={createInvite}>
          <Input
            id="inviteDays"
            name="inviteDays"
            label="Days"
            inputMode="numeric"
            value={form.days}
            onChange={(e) => setForm((current) => ({ ...current, days: e.target.value }))}
          />
          <Input
            id="inviteEmail"
            name="inviteEmail"
            label="Lock to email (optional)"
            placeholder="client@company.com"
            value={form.email}
            onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
          />
          <Input
            id="inviteCode"
            name="inviteCode"
            label="Custom code (optional)"
            placeholder="VIP180"
            value={form.code}
            onChange={(e) => setForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))}
          />
          <div className="flex items-end">
            <Button type="submit" className="!w-auto px-5" isLoading={actionLoading === "create"}>
              Create invite
            </Button>
          </div>
        </form>
      </Card>

      <Card className="!p-0">
        <div className="p-6 pb-3">
          <CardHeader title="Invites" subtitle="Usage counts every business that redeemed the code." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">Code</th>
                <th scope="col" className="px-4 py-3">Days</th>
                <th scope="col" className="px-4 py-3">Email lock</th>
                <th scope="col" className="px-4 py-3 text-right">Used by</th>
                <th scope="col" className="px-4 py-3">Last used</th>
                <th scope="col" className="px-4 py-3">Created</th>
                <th scope="col" className="px-6 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Loading invites...</td>
                </tr>
              ) : invites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">No trial invites yet.</td>
                </tr>
              ) : (
                invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3 font-mono font-semibold text-gray-900">{invite.code}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-600">{invite.days}</td>
                    <td className="px-4 py-3 text-gray-600">{invite.email || <Badge>Open</Badge>}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {invite._count.redemptions} {invite._count.redemptions === 1 ? "business" : "businesses"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {invite.usedAt ? (
                        <>
                          {formatAdminDate(invite.usedAt)}
                          {invite.usedByBusiness ? <span className="text-gray-400"> · {invite.usedByBusiness.name}</span> : null}
                        </>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatAdminDate(invite.createdAt)}</td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyCode(invite.code)}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === `delete:${invite.id}`}
                          onClick={() => removeInvite(invite.id, invite.code)}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {actionLoading === `delete:${invite.id}` ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
